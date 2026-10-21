# Security check: as a signed-in member, direct writes on repairs / lines / history must be refused (403).
# Run after `lovable auth-session --json`: python3 scripts/check-direct-writes.py
import json, os, re, requests
m=json.load(open(os.path.expanduser("~/.cache/lovable-auth/session.json"))); tok=m["session"]["access_token"]
env=open("/dev-server/.env").read()
url=re.search(r'VITE_SUPABASE_URL="?([^"\n]+)',env).group(1); key=re.search(r'VITE_SUPABASE_PUBLISHABLE_KEY="?([^"\n]+)',env).group(1)
H={"apikey":key,"Authorization":"Bearer "+tok,"Content-Type":"application/json","Prefer":"return=representation"}
rep=requests.get(url+"/rest/v1/repairs?select=id,total_price,shop_id&limit=1",headers=H).json()
print("own repairs readable:",len(rep)>0)
if rep:
  rid=rep[0]["id"]
  print("update total_price:",requests.patch(url+f"/rest/v1/repairs?id=eq.{rid}",headers=H,json={"total_price":1}).status_code)
  print("update shop_id:",requests.patch(url+f"/rest/v1/repairs?id=eq.{rid}",headers=H,json={"shop_id":"00000000-0000-0000-0000-000000000000"}).status_code)
  print("insert item:",requests.post(url+"/rest/v1/repair_items",headers=H,json={"repair_id":rid,"name":"x","unit_price":0,"quantity":1}).status_code)
  print("update items:",requests.patch(url+f"/rest/v1/repair_items?repair_id=eq.{rid}",headers=H,json={"unit_price":0}).status_code)
  print("delete items:",requests.delete(url+f"/rest/v1/repair_items?repair_id=eq.{rid}",headers=H).status_code)
  print("insert history:",requests.post(url+"/rest/v1/repair_status_history",headers=H,json={"repair_id":rid,"status":"termine","employee_name":"x"}).status_code)
  print("insert repair:",requests.post(url+"/rest/v1/repairs",headers=H,json={"shop_id":rep[0]["shop_id"]}).status_code)
  after=requests.get(url+f"/rest/v1/repairs?id=eq.{rid}&select=total_price",headers=H).json()
  print("total unchanged:",after[0]["total_price"]==rep[0]["total_price"])
print("other shops visible:",requests.get(url+"/rest/v1/repairs?select=shop_id",headers=H).json().__len__(), "distinct shops:",len({r["shop_id"] for r in requests.get(url+"/rest/v1/repairs?select=shop_id",headers=H).json()}))
