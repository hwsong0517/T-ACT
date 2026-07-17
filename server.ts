/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const PORT = 3000;
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  app.use(express.json());

  // Initialize Gemini AI
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // AI Optimization Guide Endpoint
  app.post('/api/optimize', async (req, res) => {
    try {
      const { analysisData, targetGap } = req.body;

      const systemInstruction = `
# Role
당신은 한화에어로스페이스 PGM 사업부 소속의 '정밀 구동장치 설계 수석 엔지니어'입니다. 
당신의 임무는 신입 연구원이 입력한 2D/3D 치수 데이터를 바탕으로 누적 공차를 해석하고, MIL-STD-810H 규격에 부합하는지 검토하는 것입니다.

# Principles (중요 규칙)
1. 모든 계산은 'Worst-case' 시나리오(단순 선형 합산)를 기반으로 합니다.
2. 가공 현실성: 공차 수정 제안 시 ±0.03mm 미만의 수치는 제안하지 마십시오. (가공 불가능 방지)
3. COTS 보호: '베어링', '모터', '센서' 등 구매 부품의 공차는 수정 제안에서 절대 제외하십시오.
4. 환경 고려: 알루미늄(AL6061), 강재(STS440C) 등 일반적인 국방 부품 재질의 열팽창 계수를 적용하여 수치를 보정하십시오.

# Workflow
1. 사용자가 부품 리스트와 치수(Nominal), 공차(Tolerance)를 입력합니다.
2. 각 부품의 공차 기여도(Sensitivity)를 백분율로 계산합니다.
3. 누적 공차 합계(Total Stack-up)가 설계 목표(Target Gap)를 벗어나는지 확인합니다.
4. 부적합 시, 아래 우선순위에 따라 수정을 제안하여 **반드시** 'PASS'가 되도록 하십시오:
   - **목표**: 제안된 수치를 적용했을 때 누적 공차 범위가 목표 범위(Target Gap)의 중앙(Center)에 위치하도록 하고, 양쪽 경계에서 최소 **0.02mm 이상의 명확한 마진(Margin)**을 확보하십시오.
   - **1순위**: '가공품'의 공차를 정밀화하여 전체 범위를 좁힙니다. (최소 ±0.03mm 권장)
   - **2순위**: 공차 조정만으로 부족할 경우, '가공품' 중 하나(예: 스페이서, 심 등)의 설계치수(Nominal)를 변경하여 유격 범위를 목표 구간의 중앙으로 이동시킵니다.
   - **자가 검증**: 제안하는 수치들을 모두 합산했을 때, 실제로 Target Min/Max 사이에 들어오는지 최종 확인 후 응답하십시오.
   - 주의: COTS(구매품)의 치수나 공차는 절대 변경하지 마십시오.

# Output Format (JSON)
반드시 아래와 같은 JSON 구조로만 응답하십시오:
{
  "analysisMarkdown": "상세 분석 내용. 현재 상태 설명 -> 수정 전략 설명 -> **수정 후 예상 결과(Min/Max/Nominal)** 포함.",
  "suggestions": [
    {
      "partName": "부품명",
      "currentNominal": 현재 설계치수,
      "suggestedNominal": 제안 설계치수,
      "currentUpper": 현재 상한공차,
      "currentLower": 현재 하한공차,
      "suggestedUpper": 제안 상한공차,
      "suggestedLower": 제안 하한공차,
      "reason": "수정 이유 (예: '누적 공차 범위를 줄이기 위해 공차 정밀화', '유격 중심을 맞추기 위해 치수 변경')"
    }
  ]
}
`;

      const prompt = `
분석 데이터:
목표 유격: ${targetGap.min}mm ~ ${targetGap.max}mm
환경: ${analysisData.environment}
현재 누적 결과: Min ${analysisData.worstCaseMin.toFixed(3)}mm, Max ${analysisData.worstCaseMax.toFixed(3)}mm, Nominal ${analysisData.nominalGap.toFixed(3)}mm
부품 리스트:
${analysisData.parts.map((p: any) => `- ${p.partName}: 현재치수(${p.currentNominal}), 현재공차(${p.currentUpper}/${p.currentLower}), 기여도 ${p.sensitivity.toFixed(1)}%, 가공품여부: ${p.isMachined}`).join('\n')}

위 데이터를 바탕으로 최적화 제안을 JSON 형식으로 작성해줘.
`;

      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
        },
      });

      if (!result || !result.text) {
        throw new Error('Empty response from AI');
      }

      // Even more robust JSON extraction: find the first { and the last }
      let jsonText = result.text.trim();
      const firstBrace = jsonText.indexOf('{');
      const lastBrace = jsonText.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonText = jsonText.substring(firstBrace, lastBrace + 1);
      } else if (jsonText.includes('```')) {
        const matches = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (matches && matches[1]) {
          jsonText = matches[1].trim();
        }
      }

      const parsed = JSON.parse(jsonText);
      res.json({
        analysisMarkdown: parsed.analysisMarkdown || '',
        suggestions: parsed.suggestions || []
      });
    } catch (error: any) {
      console.error('AI Optimization Error:', error);
      res.status(500).json({ error: error.message || 'AI processing failed' });
    }
  });

  // Vite middleware for development
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
