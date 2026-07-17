/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Part, Material, EnvironmentCondition, AnalysisResult, PartContribution } from '../types';

// Coefficients of Linear Thermal Expansion (CLTE) in 10^-6 / °C
const CLTE: Record<Material, number> = {
  [Material.AL6061]: 23.6e-6,
  [Material.STS440C]: 10.2e-6,
  [Material.NONE]: 0,
};

const REF_TEMP = 20; // Standard reference temperature in Celsius
const ENV_TEMPS: Record<EnvironmentCondition, number> = {
  [EnvironmentCondition.STANDARD]: 20,
  [EnvironmentCondition.HIGH_TEMP]: 71,
  [EnvironmentCondition.LOW_TEMP]: -40,
};

export function calculateWorstCase(
  parts: Part[],
  targetMin: number,
  targetMax: number,
  env: EnvironmentCondition
): AnalysisResult {
  const temp = ENV_TEMPS[env];
  const deltaT = temp - REF_TEMP;

  let totalNominal = 0;
  let totalUpper = 0;
  let totalLower = 0;

  const adjustedParts = parts.map(p => {
    const clte = CLTE[p.material] || 0;
    const thermalExpansion = p.nominal * clte * deltaT;
    const adjNominal = p.nominal + thermalExpansion;
    
    totalNominal += adjNominal;

    // Correct Worst-case logic for mixed directions:
    // If nominal > 0 (Outer/Increasing), Upper increases gap, Lower decreases gap.
    // If nominal < 0 (Inner/Decreasing), Upper (positive) decreases gap, Lower (negative) increases gap.
    if (p.nominal >= 0) {
      totalUpper += p.upperTolerance;
      totalLower += p.lowerTolerance;
    } else {
      // For negative nominals (inner parts):
      // Lower tol (negative) makes part smaller -> gap bigger -> adds to totalUpper
      // Upper tol (positive) makes part bigger -> gap smaller -> adds to totalLower
      totalUpper -= p.lowerTolerance;
      totalLower -= p.upperTolerance;
    }

    return { ...p, adjNominal };
  });

  const minGap = totalNominal + totalLower;
  const maxGap = totalNominal + totalUpper;

  // Add a small epsilon (0.0001) to handle floating point precision
  const EPSILON = 0.0001;
  const isCompliant = minGap >= (targetMin - EPSILON) && maxGap <= (targetMax + EPSILON);

  // Calculate sensitivity
  const totalRange = totalUpper - totalLower;
  const contributions: PartContribution[] = parts.map(p => {
    const range = Math.abs(p.upperTolerance - p.lowerTolerance);
    const sensitivity = totalRange > 0 ? (range / totalRange) * 100 : 0;
    return {
      partId: p.id,
      partName: p.name,
      sensitivity,
      isCritical: sensitivity > 30,
      isMachined: p.type === 'MACHINED',
      currentUpper: p.upperTolerance,
      currentLower: p.lowerTolerance,
      currentNominal: p.nominal
    };
  });

  return {
    nominalGap: totalNominal,
    worstCaseMin: minGap,
    worstCaseMax: maxGap,
    isCompliant,
    parts: contributions.sort((a, b) => b.sensitivity - a.sensitivity),
    environment: env
  };
}
