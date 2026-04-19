import { createFileRoute } from "@tanstack/react-router";
import { useAppStore } from "@/store/useAppStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const profile = useAppStore((s) => s.profile);
  const settings = useAppStore((s) => s.settings);
  const setName = useAppStore((s) => s.setDisplayName);
  const update = useAppStore((s) => s.updateSettings);

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">Customize Prepwise to match how you work.</p>
      </header>

      <Card className="bg-surface border-border">
        <CardHeader><CardTitle className="text-lg">Profile</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="name">Display name</Label>
          <Input id="name" value={profile.displayName} onChange={(e) => setName(e.target.value)} className="bg-surface-elevated border-border" />
        </CardContent>
      </Card>

      <Card className="bg-surface border-border">
        <CardHeader><CardTitle className="text-lg">Interface</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label>UI scale: <span className="text-muted-foreground">{Math.round(settings.uiScale * 100)}%</span></Label>
            <Slider
              value={[settings.uiScale]}
              min={0.85} max={1.25} step={0.05}
              onValueChange={(v) => update({ uiScale: v[0] })}
              className="mt-3"
            />
          </div>

          <div>
            <Label className="block mb-2">Navbar alignment</Label>
            <RadioGroup
              value={settings.navAlignment}
              onValueChange={(v) => update({ navAlignment: v as never })}
              className="flex gap-4"
            >
              {(["left", "center", "right"] as const).map((a) => (
                <label key={a} className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value={a} id={`nav-${a}`} /> <span className="capitalize">{a}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="floating">Floating navbar</Label>
              <p className="text-xs text-muted-foreground">Pin nav to bottom as a floating pill.</p>
            </div>
            <Switch id="floating" checked={settings.floatingNav} onCheckedChange={(b) => update({ floatingNav: b })} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="labels">Show nav labels</Label>
              <p className="text-xs text-muted-foreground">Hide for icon-only minimal nav.</p>
            </div>
            <Switch id="labels" checked={settings.showNavLabels} onCheckedChange={(b) => update({ showNavLabels: b })} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-surface border-border">
        <CardHeader><CardTitle className="text-lg">Pomodoro durations</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-3">
          <div>
            <Label htmlFor="work">Work (min)</Label>
            <Input id="work" type="number" min={5} max={90} value={settings.workMin} onChange={(e) => update({ workMin: Number(e.target.value) })} className="bg-surface-elevated border-border" />
          </div>
          <div>
            <Label htmlFor="short">Short break</Label>
            <Input id="short" type="number" min={1} max={30} value={settings.shortMin} onChange={(e) => update({ shortMin: Number(e.target.value) })} className="bg-surface-elevated border-border" />
          </div>
          <div>
            <Label htmlFor="long">Long break</Label>
            <Input id="long" type="number" min={5} max={60} value={settings.longMin} onChange={(e) => update({ longMin: Number(e.target.value) })} className="bg-surface-elevated border-border" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
