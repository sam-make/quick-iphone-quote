import { useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Bar, BarChart } from "recharts";
import { Activity, Building2, Users, Wrench, Smartphone, Search } from "lucide-react";
import { getOwnerAnalytics } from "@/lib/owner-analytics.functions";
import { inactivityDays, isInactive, rankShops, usageFrequency, type AnalyticsShop } from "@/lib/owner-analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { CountUp, FadeUp } from "@/components/motion";

export type AnalyticsFilters = {days: 7|30|90; shop: string; rank: "estimates"|"frequency"; inactive: "all"|"never"|"7"|"14"|"30"; q: string};
export const ownerAnalyticsOptions = (days: 7|30|90, shop: string) => queryOptions({
  queryKey: ["owner-analytics",days,shop],
  queryFn: () => getOwnerAnalytics({data:{days,shopId:shop || undefined}}),
  staleTime: 30_000,
});
const formatDate = (value: string | null) => value ? new Date(value).toLocaleString("fr-FR",{timeZone:"Europe/Paris",dateStyle:"short",timeStyle:"short"}) : "Non disponible";
const eventLabels: Record<string,string> = {estimation:"Estimation créée",repair:"Réparation créée",customer:"Client créé",repair_status:"Statut de réparation changé",presence:"Présence dans l’application"};
const chartConfig = {estimations:{label:"Estimations",color:"var(--primary)"},repairs:{label:"Réparations",color:"var(--success)"},customers:{label:"Clients",color:"var(--chart-4)"}};

export function OwnerAnalytics({filters,onChange}: {filters: AnalyticsFilters; onChange: (change: Partial<AnalyticsFilters>)=>void}) {
  const {data} = useSuspenseQuery(ownerAnalyticsOptions(filters.days,filters.shop));
  const [detailId,setDetailId] = useState<string|null>(null);
  const [chartMode,setChartMode] = useState<"area"|"bar">("area");
  const selected = data.shops.filter(s=>!filters.shop || s.id===filters.shop);
  const active = selected.filter(s=>s.last_activity && !isInactive(s.last_activity,data.now,7)).length;
  const totals = [selected.length,active,selected.length-active,...(["estimations","repairs","customers"] as const).map(key=>selected.reduce((sum,s)=>sum+s[key],0))];
  const labels = ["Boutiques inscrites","Actives · 7 jours","Inactives / non observées","Estimations totales","Réparations totales","Clients actuels"];
  const icons = [Building2,Activity,Activity,Smartphone,Wrench,Users];
  const colors = ["text-primary","text-success","text-warning","text-primary","text-success","text-chart-4"];
  const filtered = rankShops(selected.filter(s=>s.name.toLocaleLowerCase().includes(filters.q.toLocaleLowerCase()) && (filters.inactive==="all" || (filters.inactive==="never" ? s.last_activity===null : isInactive(s.last_activity,data.now,Number(filters.inactive))))),filters.rank);
  const detail = data.shops.find(s=>s.id===detailId);
  const shopName = (id:string)=>data.shops.find(s=>s.id===id)?.name ?? "Boutique";
  function status(s:AnalyticsShop) {
    if (!s.last_activity) return "Aucune activité connue";
    const days=inactivityDays(s.last_activity,data.now) ?? 0;
    return days>=7 ? `Inactive depuis ${days} j` : "Active";
  }
  return <section className="min-w-0 space-y-7" aria-label="Analytics">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><h2 className="text-2xl font-semibold">Analytics</h2><p className="mt-1 text-sm text-muted-foreground">Activité des boutiques · {formatDate(data.now)}</p></div>
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1" aria-label="Période">{([7,30,90] as const).map(days=><Button key={days} size="sm" variant={filters.days===days?"default":"outline"} aria-pressed={filters.days===days} onClick={()=>onChange({days})}>{days} jours</Button>)}</div>
        <Select value={filters.shop || "all"} onValueChange={v=>onChange({shop:v==="all"?"":v})}><SelectTrigger aria-label="Filtrer par boutique" className="w-full sm:w-56"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Toutes les boutiques</SelectItem>{data.shops.map(s=><SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
      </div>
    </header>
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">{labels.map((label,i)=>{const Icon=icons[i];return <FadeUp key={label} delay={i*45}><div className="h-full rounded-lg border border-border bg-card p-4"><Icon className={`mb-3 size-5 ${colors[i]}`}/><p className="text-2xl font-semibold tabular-nums"><CountUp value={totals[i]}/></p><p className="mt-1 text-xs leading-5 text-muted-foreground">{label}</p></div></FadeUp>;})}</div>
    <div className="border-y border-border py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-semibold">Évolution de l’activité</h3><div className="flex gap-2"><Button variant={chartMode==="area"?"secondary":"ghost"} size="sm" onClick={()=>setChartMode("area")}>Courbes</Button><Button variant={chartMode==="bar"?"secondary":"ghost"} size="sm" onClick={()=>setChartMode("bar")}>Barres</Button></div></div>
      <ChartContainer config={chartConfig} className="h-72 w-full aspect-auto">
        {chartMode==="area" ? <AreaChart data={data.trend} accessibilityLayer><CartesianGrid vertical={false}/><XAxis dataKey="date" tickFormatter={v=>String(v).slice(5)} minTickGap={25}/><YAxis allowDecimals={false} width={30}/><ChartTooltip content={<ChartTooltipContent/>}/><ChartLegend content={<ChartLegendContent/>}/>{(["estimations","repairs","customers"] as const).map(key=><Area key={key} dataKey={key} type="monotone" stroke={`var(--color-${key})`} fill={`var(--color-${key})`} fillOpacity={0.08} isAnimationActive={false}/>)}</AreaChart>
        : <BarChart data={data.trend} accessibilityLayer><CartesianGrid vertical={false}/><XAxis dataKey="date" tickFormatter={v=>String(v).slice(5)} minTickGap={25}/><YAxis allowDecimals={false} width={30}/><ChartTooltip content={<ChartTooltipContent/>}/><ChartLegend content={<ChartLegendContent/>}/>{(["estimations","repairs","customers"] as const).map(key=><Bar key={key} dataKey={key} fill={`var(--color-${key})`} isAnimationActive={false}/>)}</BarChart>}
      </ChartContainer>
      {!data.trend.some(t=>t.estimations+t.repairs+t.customers>0) && <p className="mt-3 text-sm text-muted-foreground">Aucune création sur cette période.</p>}
    </div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{(["never","7","14","30"] as const).map((key,i)=><Button key={key} variant={filters.inactive===key?"secondary":"outline"} className="h-auto justify-between whitespace-normal py-3 text-left" onClick={()=>onChange({inactive:filters.inactive===key?"all":key})}><span className="text-xs">{i===0?"Jamais observées":`Sans activité ≥ ${key} j`}</span><span className="ml-2 font-semibold">{selected.filter(s=>key==="never"?s.last_activity===null:isInactive(s.last_activity,data.now,Number(key))).length}</span></Button>)}</div>
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-semibold">Classement des boutiques</h3><Select value={filters.rank} onValueChange={(v:"estimates"|"frequency")=>onChange({rank:v})}><SelectTrigger aria-label="Classer les boutiques" className="w-56"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="estimates">Nombre d’estimations</SelectItem><SelectItem value="frequency">Fréquence d’utilisation</SelectItem></SelectContent></Select></div>
      <div className="relative"><Search className="absolute left-3 top-3 size-4 text-muted-foreground"/><Input aria-label="Rechercher une boutique Analytics" placeholder="Rechercher une boutique" value={filters.q} onChange={e=>onChange({q:e.target.value})} className="pl-9"/></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[750px] text-left text-sm"><thead className="border-b border-border text-muted-foreground"><tr>{["Rang / Boutique","Activité","Estimations · période","Jours actifs","Jours / semaine","Dernière activité",""].map((l,i)=><th key={i} className="px-3 py-3 font-medium">{l}</th>)}</tr></thead><tbody>{filtered.map((s,i)=><tr key={s.id} className="border-b border-border"><td className="px-3 py-4"><span className="mr-3 text-muted-foreground">{i+1}</span><span className="font-medium">{s.name}</span>{(s.suspended_at || s.archived_at) && <p className="text-xs text-warning">{s.archived_at?"Archivée":"Suspendue"}</p>}</td><td className="px-3 py-4">{status(s)}</td><td className="px-3 py-4 font-semibold tabular-nums">{s.period_estimates}</td><td className="px-3 py-4">{s.active_days} / {filters.days}</td><td className="px-3 py-4">{usageFrequency(s.active_days,filters.days)}</td><td className="px-3 py-4">{formatDate(s.last_activity)}</td><td className="px-3 py-4"><Button size="sm" variant="outline" onClick={()=>setDetailId(s.id)}>Fiche boutique</Button></td></tr>)}</tbody></table></div>
      {!filtered.length && <p className="py-6 text-center text-muted-foreground">Aucune boutique pour ces filtres.</p>}
    </div>
    <div><h3 className="mb-4 text-lg font-semibold">Activités récentes · {filters.days} jours</h3><ul className="divide-y divide-border">{data.history.slice(0,20).map((e,i)=><li key={i} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span><span className="font-medium">{shopName(e.shop_id)}</span> · {eventLabels[e.kind] ?? e.kind}</span><time className="text-muted-foreground">{formatDate(e.occurred_at)}</time></li>)}</ul>{!data.history.length && <p className="text-sm text-muted-foreground">Aucune activité connue sur cette période.</p>}</div>
    <p className="text-xs leading-5 text-muted-foreground">Présences mesurées depuis le {formatDate(data.tracking_since)}. Historique antérieur limité aux créations et statuts conservés. Activité : opération métier ou présence ; active : moins de 7 jours depuis la dernière activité. Les seuils d’inactivité sont cumulatifs. Fréquence : jours actifs observés, rapportés à une semaine sur la période sélectionnée.</p>
    <Dialog open={!!detail} onOpenChange={open=>{if(!open)setDetailId(null);}}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{detail?.name}</DialogTitle></DialogHeader>{detail && <>
      <dl className="grid grid-cols-2 gap-4 text-sm">{[["Inscription",formatDate(detail.created_at)],["Dernière connexion d’un membre",formatDate(detail.last_login)],["Dernière activité",formatDate(detail.last_activity)],["État",status(detail)],["Estimations totales",detail.estimations],["Réparations",detail.repairs],["Clients",detail.customers],["Estimations · aujourd’hui",detail.estimates_today],["Estimations · 7 jours",detail.estimates_week],["Estimations · 30 jours",detail.estimates_month],["Fréquence · jours / semaine",usageFrequency(detail.active_days,filters.days)],["Présences mesurées · période",detail.presence_days]].map(([l,v])=><div key={String(l)}><dt className="text-xs text-muted-foreground">{l}</dt><dd className="mt-1 break-words font-medium">{v}</dd></div>)}</dl>
      <Button variant="outline" onClick={()=>{onChange({shop:detail.id});setDetailId(null);}}>Voir les graphiques de cette boutique</Button>
      <h3 className="mt-3 font-semibold">Historique · {filters.days} jours</h3><ul className="divide-y divide-border">{data.history.filter(e=>e.shop_id===detail.id).slice(0,50).map((e,i)=><li key={i} className="py-2 text-sm">{eventLabels[e.kind]}<time className="block text-xs text-muted-foreground">{formatDate(e.occurred_at)}</time></li>)}</ul><p className="text-xs text-muted-foreground">Jusqu’à 50 événements parmi les 200 activités récentes chargées. Filtrez sur cette boutique pour son historique dédié.</p>
    </>}</DialogContent></Dialog>
  </section>;
}