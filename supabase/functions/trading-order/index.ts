import { createClient } from "npm:@supabase/supabase-js@2";
const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const markets=new Set(["spot","margin","futures","perpetual"]), sides=new Set(["buy","sell"]), types=new Set(["market","limit","stop","stop_limit"]);
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});
const validText=(v:unknown,max:number)=>typeof v==="string"&&v.trim().length>0&&v.trim().length<=max;
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 try{
  const authHeader=req.headers.get("Authorization"); if(!authHeader?.startsWith("Bearer "))return json({error:"Authentication required"},401);
  const token=authHeader.slice(7); const publishableKeys=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")??"{}"); const publishableKey=publishableKeys.default; if(!publishableKey)return json({error:"Supabase publishable key is not configured"},503);
  const supabase=createClient(Deno.env.get("SUPABASE_URL")??"",publishableKey,{global:{headers:{Authorization:authHeader}}});
  const {data:userData,error:userError}=await supabase.auth.getUser(token); if(userError||!userData.user)return json({error:"Invalid session"},401);
  const userId=userData.user.id, body=await req.json();
  const marketType=String(body.marketType??"spot").toLowerCase(), symbol=String(body.symbol??"").trim().toUpperCase(), side=String(body.side??"").toLowerCase(), type=String(body.type??"market").toLowerCase();
  const amount=Number(body.amount), price=body.price==null?null:Number(body.price), leverage=body.leverage==null?null:Number(body.leverage), reduceOnly=Boolean(body.reduceOnly);
  const clientOrderId=body.clientOrderId==null?null:String(body.clientOrderId).trim(), idempotencyKey=body.idempotencyKey==null?null:String(body.idempotencyKey).trim();
  if(!markets.has(marketType))return json({error:"Unsupported market type"},400); if(!/^[A-Z0-9]{3,30}$/.test(symbol))return json({error:"Invalid symbol"},400); if(!sides.has(side)||!types.has(type))return json({error:"Invalid side or order type"},400); if(!Number.isFinite(amount)||amount<=0)return json({error:"Amount must be greater than zero"},400);
  if((type==="limit"||type==="stop_limit")&&(!Number.isFinite(price)||price<=0))return json({error:"A positive price is required for this order type"},400);
  if(leverage!=null&&(!Number.isFinite(leverage)||leverage<1||leverage>125))return json({error:"Leverage must be between 1 and 125"},400);
  if(marketType==="spot"&&(reduceOnly||leverage!=null))return json({error:"reduceOnly/leverage are not valid for spot orders"},400);
  if(clientOrderId!=null&&!validText(clientOrderId,64))return json({error:"Invalid clientOrderId"},400);
  if(idempotencyKey!=null&&!/^[0-9a-fA-F-]{36}$/.test(idempotencyKey))return json({error:"idempotencyKey must be a UUID"},400);
  const secretKeys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")??"{}"); const secretKey=secretKeys.default; if(!secretKey)return json({error:"Server trading key is not configured"},503);
  const admin=createClient(Deno.env.get("SUPABASE_URL")??"",secretKey);
  if(idempotencyKey){const {data:existing}=await admin.from("trading_orders").select("*").eq("user_id",userId).eq("idempotency_key",idempotencyKey).maybeSingle();if(existing)return json({order:existing,replayed:true});}
  const orderId=crypto.randomUUID();
  const {data:order,error:insertError}=await admin.from("trading_orders").insert({id:orderId,user_id:userId,session_id:"server",pair_symbol:symbol,market_type:marketType,side,type,price,amount,total:price==null?0:price*amount,fee:0,status:"queued",source:"server-order-intake",time_in_force:body.timeInForce==null?null:String(body.timeInForce),reduce_only:reduceOnly,leverage,client_order_id:clientOrderId,idempotency_key:idempotencyKey}).select("*").single();
  if(insertError)return json({error:insertError.message},409);
  await admin.from("trading_account_events").insert({user_id:userId,event_type:"order_queued",order_id:orderId,payload:{marketType,symbol,side,type}});
  return json({order,execution:"queued",message:"Order accepted for server-side execution. No client-side balance mutation or exchange secret is used."},202);
 }catch(error){return json({error:error instanceof Error?error.message:"Invalid request"},400)}
});
