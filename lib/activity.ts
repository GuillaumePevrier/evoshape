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
