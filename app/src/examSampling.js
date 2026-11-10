// 한능검 63~80회 시대 분류의 1차 집계로 정한 실전 모의시험 할당량.
// 정식 한능검 기관의 고정 출제 기준이 아닌 가족 공부방용 배분이다.
export const EXAM_ERA_QUOTAS = Object.freeze([
  { era: '선사', count: 1 },
  { era: '고조선·여러 나라', count: 1 },
  { era: '삼국·가야', count: 4 },
  { era: '남북국', count: 3 },
  { era: '고려', count: 9 },
  { era: '조선', count: 9 },
  { era: '개항기·대한제국', count: 7 },
  { era: '일제강점기', count: 9 },
  { era: '현대', count: 5 },
  { era: '시대종합', count: 2 },
]);

export const EXAM_QUESTION_COUNT = EXAM_ERA_QUOTAS.reduce((sum, { count }) => sum + count, 0);

// 50문항 할당량을 먼저 적용 → 시대별 미풀이 우선 → 최종 50문항 다시 섞기.
// 일부 시대의 자료가 부족하면 다른 시대로 몰래 채우지 않고 출제를 중단한다.
export function makeBalancedExam(poolQuestions, records, shuffle) {
  const attempted = new Set((records || []).map(
    r => r.exam_round + '-' + String(r.question_number).padStart(2, '0')
  ));
  const chosen = [];
  const shortages = [];
  for (const { era, count } of EXAM_ERA_QUOTAS) {
    const choices = new Map();
    for (const q of poolQuestions || []) {
      if (q.era === era && q.id && !choices.has(q.id)) choices.set(q.id, q);
    }
    const candidates = [...choices.values()];
    if (candidates.length < count) {
      shortages.push({ era, required: count, available: candidates.length });
      continue;
    }
    const unseen = shuffle(candidates.filter(q => !attempted.has(q.id)));
    const seen = shuffle(candidates.filter(q => attempted.has(q.id)));
    chosen.push(...[...unseen, ...seen].slice(0, count));
  }
  if (shortages.length) return { questions: [], shortages };
  const result = shuffle(chosen);
  if (result.length !== EXAM_QUESTION_COUNT ||
      new Set(result.map(q => q.id)).size !== EXAM_QUESTION_COUNT) {
    throw new Error('실전시험 출제 결과의 문항 수 또는 중복이 잘못되었습니다.');
  }
  return { questions: result, shortages: [] };
}
