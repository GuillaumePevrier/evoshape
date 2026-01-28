export type ActivityPreset = {
  id: string;
  label: string;
  met: number;
};

export const ACTIVITY_LIBRARY: ActivityPreset[] = [
  { id: "walk", label: "Marche moderee", met: 3.5 },
  { id: "run", label: "Course", met: 9.8 },
  { id: "cycle", label: "Velo", met: 7.5 },
  { id: "strength", label: "Musculation", met: 6 },
  { id: "yoga", label: "Yoga", met: 2.5 },
  { id: "swim", label: "Natation", met: 8 },
];

const MET_KEYWORDS: Array<{ pattern: RegExp; met: number }> = [
  { pattern: /(run|course|jog|sprint)/i, met: 9.8 },
  { pattern: /(walk|marche|rando|hike)/i, met: 6 },
  { pattern: /(cycle|velo|bike|spin)/i, met: 7.5 },
  { pattern: /(swim|natation)/i, met: 8 },
  { pattern: /(row|rameur)/i, met: 7 },
  { pattern: /(hiit|crossfit|burpee)/i, met: 8.5 },
  { pattern: /(strength|muscu|weight|halt(e|é)re|barbell|dumbbell)/i, met: 6 },
  { pattern: /(yoga|pilates|stretch)/i, met: 2.5 },
  { pattern: /(elliptical|elliptique)/i, met: 5 },
  { pattern: /(stair|step|mont(é|e)e)/i, met: 8.8 },
  { pattern: /(dance|zumba)/i, met: 6 },
];

export const estimateMetFromName = (input: string) => {
  const value = input.trim();
  if (!value) return null;
  const match = MET_KEYWORDS.find((item) => item.pattern.test(value));
  return match?.met ?? null;
};

export const estimateActivityCalories = (
  met: number,
  weightKg: number,
  minutes: number
) => {
  if (!Number.isFinite(met) || !Number.isFinite(weightKg) || !Number.isFinite(minutes)) {
    return 0;
  }
  if (met <= 0 || weightKg <= 0 || minutes <= 0) {
    return 0;
  }
  return (met * 3.5 * weightKg) / 200 * minutes;
};
