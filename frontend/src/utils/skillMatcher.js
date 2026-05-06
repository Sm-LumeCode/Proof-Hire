export function computeSkillMatch(requiredSkills, candidateSkills) {
  if (!requiredSkills || requiredSkills.length === 0) return 0;
  if (!candidateSkills || candidateSkills.length === 0) return 0;

  const req = requiredSkills.map(s => s.toLowerCase().trim());
  const cand = candidateSkills.map(s => s.toLowerCase().trim());
  
  const matched = req.filter(s => 
    cand.some(c => c.includes(s) || s.includes(c))
  );
  
  return Math.round((matched.length / req.length) * 100);
}
