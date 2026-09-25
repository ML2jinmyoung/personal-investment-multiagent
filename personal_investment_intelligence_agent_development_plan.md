# Personal Investment Intelligence Agent
## Development Plan

> 생애주기와 실제 투자자산을 이해하고, 사용자의 투자 원칙을 기준으로 투자 행동의 영향을 시뮬레이션하며, 근거 기반으로 설명하는 개인용 AI PB POC

---

# 1. 프로젝트 목적

## 1.1 문제 정의

기존 증권 서비스는 다음과 같은 정보는 잘 제공한다.

- 현재 보유 종목
- 평가금액 / 손익
- 현재가 / 차트
- 시장 뉴스
- 환율
- 수수료
- 주문 가능 금액
- 공시 / 기업 정보

하지만 사용자가 실제로 알고 싶은 것은 단순한 시장 정보 자체가 아니라 다음과 같은 질문이다.

- 오늘 시장에서 일어난 일 중 **내 돈에 중요한 변화는 무엇인가?**
- NVIDIA를 500만 원 더 사면 **내 전체 투자자산의 구조가 어떻게 바뀌는가?**
- 현재 내 포트폴리오는 내가 세운 투자 원칙을 지키고 있는가?
- 지금 행동해야 하는가, 아니면 아무것도 하지 않아도 되는가?
- 이 판단의 근거는 무엇이며, 어떤 부분은 아직 불확실한가?

본 프로젝트는 이러한 문제를 해결하는 **Personal Investment Intelligence Layer**를 만드는 것을 목표로 한다.

핵심 제품 비전은 다음과 같다.

> **누구나 자기 돈에 맞는 개인 PB를 가질 수 있게 한다.**

이 프로젝트는 종목 추천 서비스나 자동매매 시스템을 만드는 것이 아니다.

핵심은:

1. 사용자의 실제 투자자산을 이해하고
2. 사용자가 스스로 정의한 투자 원칙을 기억하며
3. 시장 변화가 사용자에게 어떤 의미인지 설명하고
4. 투자 행동 전후를 시뮬레이션하고
5. 근거와 불확실성을 구분해서 설명하는 것

이다.

---

# 2. 핵심 제품 철학

## 2.1 Prediction보다 Simulation

이 Agent는 미래 가격을 맞히는 것을 핵심 기능으로 두지 않는다.

잘못된 예:

> "삼성전자 오를까?"

핵심 질문:

> "삼성전자를 1,000만 원 더 사면 내 포트폴리오가 어떻게 변하지?"

Agent는 미래 주가를 자신 있게 예측하지 않는다.

대신 특정 조건을 입력했을 때 사용자 자산이 어떻게 바뀌는지 계산한다.

예:

- 종목 비중 변화
- 산업 비중 변화
- 국가 비중 변화
- 통화 노출 변화
- 현금/투자 가능 금액 변화
- 단일 종목 집중도 변화
- 투자 원칙 위반 여부
- 예상 수수료
- 특정 하락 시나리오에서의 영향

즉:

```text
Prediction
"What will happen?"

보다

Simulation
"What happens to me if X happens?"
```

에 집중한다.

---

## 2.2 금융 계산은 LLM에게 맡기지 않는다

시스템의 핵심 원칙:

```text
Financial Data
      ↓
Deterministic Calculation
      ↓
Agent Interpretation
      ↓
User
```

다음 계산은 TypeScript 코드로 수행한다.

- 비중 계산
- exposure 계산
- ETF look-through
- 시뮬레이션
- 수수료 계산
- 투자 원칙 위반 여부
- 시나리오 손익 계산

LLM은 숫자를 생성하지 않는다.

LLM의 역할은:

- 분석 결과 해석
- 근거 정리
- 대안 제시
- 위험 설명
- 사용자에게 자연어로 전달

이다.

---

## 2.3 모든 투자 답변은 근거를 가진다

투자 의사결정 관련 답변의 기본 구조:

```text
Evidence
↓
Alternatives
↓
Risk & Uncertainty
↓
Cost
↓
Investment Policy Check
↓
Recommendation
```

Agent는 다음과 같은 문장을 단독으로 출력하면 안 된다.

- "좋아 보입니다."
- "매수해도 괜찮습니다."
- "상승 가능성이 높습니다."

Recommendation은 항상 앞의 Evidence와 연결되어야 한다.

---

# 3. POC의 핵심 사용자 경험

POC는 많은 기능을 만드는 것이 목적이 아니다.

다음 네 가지 경험을 명확하게 검증한다.

## 3.1 My Investment Policy

사용자가 자신의 투자 원칙을 정의한다.

예:

```text
투자 목적
장기 자산 증식

투자 기간
10년 이상

최대 허용 손실
-20%

단일 종목 최대 비중
15%

기술주 최대 비중
35%

해외자산 최대 비중
70%

최소 유동성
10%

투자 스타일
장기 / 저회전
```

이 정보는 단순 프로필이 아니라 **Agent Decision Constraint**로 사용된다.

---

## 3.2 Today for Me

첫 화면의 핵심 기능.

기존 증권 앱처럼 시장 지수, 인기 종목, 뉴스부터 보여주지 않는다.

대신:

> **오늘 내 돈에 중요한 변화**

를 보여준다.

예:

```text
오늘 내 자산에 중요한 변화 3개

1. NVIDIA -7%

NVIDIA 직접 보유와 ETF 내부 노출을 합하면
연결된 투자자산의 11.3%가 NVIDIA에 노출되어 있습니다.

오늘 NVIDIA 가격 변화는 전체 일간 손실의 약 61%를 차지했습니다.


2. USD/KRW -1.8%

현재 연결 자산 중 USD 노출이 약 62%입니다.

원화 강세로 인해 원화 환산 평가액에 부정적인 영향을 받았습니다.


3. 삼성전자 신규 공시

현재 삼성전자는 연결 자산의 8.4%입니다.

오늘 새로운 실적 관련 공시가 등록되었습니다.
```

핵심 변환:

```text
Market Information
       ↓
My Exposure
       ↓
Portfolio Impact
       ↓
Personal Relevance
```

---

## 3.3 What-if Simulation

사용자 질문:

> "NVDA를 500만 원 더 사면?"

시스템은 실제 주문을 발생시키지 않는다.

현재 portfolio snapshot에 hypothetical transaction을 적용한다.

예:

| 항목 | 현재 | 매수 후 |
|---|---:|---:|
| NVDA 비중 | 11.2% | 16.7% |
| 미국주식 비중 | 61.0% | 65.1% |
| USD exposure | 61.0% | 65.1% |
| 투자 가능 금액 | 1,200만 | 700만 |
| 단일 종목 한도 | 15% 이하 | 위반 |

---

## 3.4 Explainable Decision

Agent는 최종적으로 다음과 같이 답한다.

### Evidence

- 현재 NVDA 실질 exposure: 11.2%
- 500만 원 추가 매수 시: 16.7%
- 사용자 단일 종목 한도: 15%
- 현재 투자 가능 금액: 1,200만 원

### Alternatives

- 500만 원 매수
- 250만 원만 매수
- ETF로 분산
- 기존 집중 종목 일부 축소 후 매수
- 아무것도 하지 않음

### Risk & Uncertainty

- 다음 실적은 아직 확정되지 않음
- 금리 / 환율 변화
- 주가 변동성

### Cost

- 수수료
- 세금
- 환전비용

### Investment Policy Check

```text
❌ 단일 종목 최대 15% → 16.7%
⚠ USD exposure 증가
✓ 장기 투자 기간 조건에는 부합
```

### Recommendation

앞선 Evidence를 기반으로 설명한다.

Agent는 필요한 경우:

> "현재 설정한 투자 원칙을 기준으로 보면 추가 거래를 하지 않는 선택도 합리적입니다."

라고 말할 수 있어야 한다.

---

# 4. 전체 시스템 아키텍처

```text
                       ┌────────────────────────────┐
                       │        Next.js PWA        │
                       │                            │
                       │  Today for Me              │
                       │  Assets                    │
                       │  Ask AI PB                 │
                       │  Investment Policy         │
                       │  Developer Trace           │
                       └──────────────┬─────────────┘
                                      │
                                      ▼
                       ┌────────────────────────────┐
                       │      Backend / BFF         │
                       │      Next.js API           │
                       └──────────────┬─────────────┘
                                      │
             ┌────────────────────────┼────────────────────────┐
             │                        │                        │
             ▼                        ▼                        ▼

      Portfolio Layer          Intelligence Layer        Agent Runtime

             │                        │                        │
      Toss Open API            Exposure Engine          Orchestrator
      Mock MyData              Simulation Engine             │
      ETF Holdings             Policy Engine                 │
      DART / SEC               Relevance Engine              │
                                                             │
                                           ┌─────────────────┼──────────────┐
                                           ▼                 ▼              ▼
                                    Portfolio Agent    Evidence Agent    LLM Critic
                                           │                 │              │
                                           └─────────────────┼──────────────┘
                                                             ▼
                                                        Synthesizer
                                                             │
                                              ┌──────────────┴─────────────┐
                                              ▼                            ▼
                                           OpenAI                       Claude
```

---

# 5. 기술 스택

## Frontend

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- mobile-first responsive UI
- PWA

## Backend

초기 POC에서는 별도 서버를 나누지 않고 Next.js Route Handlers를 BFF로 사용한다.

이유:

- 배포 단순화
- frontend/backend type 공유
- 한 repo에서 구현 가능
- POC 규모에 적절함

향후 규모가 커지면 Agent runtime이나 financial service를 별도 backend로 분리할 수 있다.

## Database

- SQLite
- Drizzle ORM

저장 대상:

- Investment Policy
- Demo/MyData mock accounts
- model configuration
- conversations
- messages
- agent_runs
- agent_steps
- tool_calls

실제 brokerage holding은 기본적으로 영구 저장하지 않는다.

필요한 경우 짧은 TTL cache만 사용한다.

## LLM

provider abstraction:

- OpenAI API
- Anthropic Claude API

초기 구현:

- Vercel AI SDK Core
- `@ai-sdk/openai`
- `@ai-sdk/anthropic`
- Zod structured output

모델 이름은 코드에 하드코딩하지 않는다.

---

# 6. 금융 데이터 구조

## 6.1 Toss Securities Open API

토스증권에서 이미 제공하는 데이터는 다시 만들지 않는다.

사용 대상:

- 계좌
- 보유 종목
- 평가액
- 평균 매입가
- 손익
- 현재가
- 과거 가격
- 종목 정보
- 환율
- 수수료
- buying power
- 시장 지표
- 투자 경고
- 수급 / 공매도 등 지원 정보

원칙:

> Toss Open API = Financial Data Layer  
> 이 프로젝트 = Personal Investment Intelligence Layer

---

## 6.2 다른 증권사 / 퇴직연금

실제 제품에서는 MyData 기반 통합 자산 조회를 가정한다.

POC에서는 직접 MyData를 사용할 수 없는 경우 다음처럼 구성한다.

```text
PortfolioProvider

├── TossPortfolioProvider
└── MockMyDataProvider
```

MockMyDataProvider에 다음을 포함한다.

- 삼성증권
- 메리츠증권
- IRP
- DC 퇴직연금
- 연금저축
- 기타 투자계좌

UI에서 반드시 LIVE와 DEMO를 구분한다.

예:

```text
토스증권            LIVE
삼성증권            DEMO · MyData
메리츠증권 IRP      DEMO · MyData
DC 퇴직연금         DEMO · MyData
```

---

## 6.3 외부 Evidence

### 국내 기업

OpenDART

용도:

- 최근 공시
- 사업보고서
- 분기/반기보고서
- 주요사항보고서
- 재무제표

### 미국 기업

SEC EDGAR

용도:

- 10-K
- 10-Q
- 8-K
- Company Facts / XBRL

### ETF holdings

우선순위:

1. ETF 운용사 공식 holdings
2. 외부 ETF data provider
3. POC용 static snapshot

항상 `as_of` 저장.

---

# 7. Data Provenance

모든 금융 데이터는 source metadata를 가져야 한다.

```ts
interface Provenance {
  source: string;
  asOf?: string;
  retrievedAt: string;
  isMock: boolean;
}
```

예:

```json
{
  "symbol": "NVDA",
  "price": 182.31,
  "source": "Toss Securities Open API",
  "asOf": "2026-09-22T10:31:00+09:00",
  "retrievedAt": "2026-09-22T10:31:03+09:00",
  "isMock": false
}
```

Agent는 stale / missing data를 숨기지 않는다.

예:

> "해당 ETF의 최신 constituent 데이터를 확인하지 못해 이번 exposure 계산에서는 제외했습니다."

---

# 8. Internal Domain Model

외부 API response를 LLM에게 그대로 전달하지 않는다.

모든 데이터를 내부 schema로 normalization 한다.

```ts
interface Account {
  id: string;
  provider: string;
  type: "brokerage" | "irp" | "dc" | "pension" | "other";
  isLive: boolean;
}

interface Position {
  accountId: string;
  symbol: string;
  name: string;

  assetType:
    | "stock"
    | "etf"
    | "bond"
    | "cash"
    | "fund"
    | "other";

  market: "KR" | "US" | "OTHER";
  currency: string;

  quantity: number;
  averagePrice?: number;
  currentPrice?: number;

  marketValueKRW: number;

  provenance: Provenance;
}

interface PortfolioSnapshot {
  asOf: string;

  accounts: Account[];
  positions: Position[];

  totals: {
    marketValueKRW: number;

    byBroker: Record<string, number>;
    byCurrency: Record<string, number>;
    byAccountType: Record<string, number>;
  };
}
```

---

# 9. Provider Interface

```ts
export interface PortfolioProvider {
  getAccounts(): Promise<Account[]>;

  getPositions(
    accountId?: string
  ): Promise<Position[]>;

  getBuyingPower?(
    accountId: string
  ): Promise<Money>;
}
```

구현:

```text
TossPortfolioProvider
MockMyDataProvider
```

Market Data:

```ts
export interface MarketDataProvider {
  getQuote(symbol: string): Promise<Quote>;

  getQuotes(symbols: string[]): Promise<Quote[]>;

  getPriceHistory(
    symbol: string,
    period: string
  ): Promise<Candle[]>;
}
```

---

# 10. Investment Policy

```ts
interface InvestmentPolicy {
  objective:
    | "wealth_growth"
    | "retirement"
    | "home_purchase"
    | "capital_preservation";

  horizonYears: number;

  maxDrawdownPct?: number;

  limits: {
    singleStockPct?: number;
    sectorPct?: number;
    overseasPct?: number;
    riskyAssetPct?: number;
    minLiquidityPct?: number;
  };

  preferences: {
    turnover: "low" | "medium" | "high";
    fxRisk: "low" | "medium" | "high";
  };
}
```

Policy check는 AI가 아니라 코드가 수행한다.

```ts
policyEngine.check(
  beforePortfolio,
  afterPortfolio,
  investmentPolicy
)
```

예:

```json
{
  "violations": [
    {
      "rule": "singleStockPct",
      "limit": 15,
      "before": 11.2,
      "after": 16.7
    }
  ]
}
```

---

# 11. Exposure Engine

계산 대상:

- 종목별 exposure
- ETF look-through exposure
- sector
- country
- currency
- asset class

예:

```text
Direct NVDA
+
QQQ × NVDA weight
+
VOO × NVDA weight
=
Actual NVDA Exposure
```

계산 결과:

```ts
interface Exposure {
  key: string;

  directValueKRW: number;
  indirectValueKRW: number;
  totalValueKRW: number;

  portfolioWeightPct: number;
}
```

---

# 12. Simulation Engine

Simulation은 완전히 deterministic하다.

API:

```http
POST /api/simulate
```

예:

```json
{
  "symbol": "NVDA",
  "action": "buy",
  "amountKRW": 5000000
}
```

결과:

```json
{
  "before": {
    "nvdaWeight": 11.2,
    "usEquityWeight": 61.0,
    "usdExposure": 61.0
  },

  "after": {
    "nvdaWeight": 16.7,
    "usEquityWeight": 65.1,
    "usdExposure": 65.1
  },

  "cost": {
    "commission": 4200
  },

  "policyChecks": [
    {
      "rule": "singleStockPct",
      "status": "violation",
      "limit": 15,
      "value": 16.7
    }
  ]
}
```

지원할 simulation:

### Transaction

- BUY
- SELL

### Scenario

- stock price ±X%
- sector ±X%
- FX ±X%
- market index ±X%

Prediction과 구분한다.

```text
"NVIDIA가 30% 떨어질 것이다" X

"NVIDIA가 30% 하락한다고 가정하면
현재 포트폴리오에는 약 X원의 영향을 준다." O
```

---

# 13. Today-for-Me Relevance Engine

Today for Me는 처음부터 LLM에게 뉴스 목록을 던져 ranking하게 하지 않는다.

후보 event는 코드로 만든다.

예:

```text
portfolio position
      ↓
daily price move
      ↓
P&L contribution
      ↓
currency move
      ↓
warning / filing
      ↓
policy proximity
```

financial impact는 deterministic.

그 다음 fuzzy relevance 판단은 Jev를 사용할 수 있다.

예:

```text
Is this materially relevant to the investor today?

Does this warrant surfacing?

Does this require an explanation?

Does this raise an investment-policy concern?
```

최종 ranking 예시:

```text
importance
=
financial impact
+
policy relevance
+
Jev relevance
```

---

# 14. Multi-Agent System

이 프로젝트는 단순한 single-agent chatbot이 아니다.

그러나 모든 질문에서 모든 Agent를 호출하지 않는다.

핵심 목표:

> **필요한 intelligence만 선택적으로 사용한다.**

Agent:

1. Portfolio Agent
2. Evidence Agent
3. LLM Critic
4. Synthesizer

Decision Model:

5. Jev

Deterministic Services:

- Simulation Engine
- Policy Engine
- Exposure Engine
- Relevance Engine

모든 구성요소를 직접 만든 Orchestrator가 조합한다.

---

# 15. Agent 역할

## 15.1 Portfolio Agent

질문:

> "나에게 어떤 의미인가?"

Tools:

```text
getPortfolioSnapshot
getPosition
getExposure
getBuyingPower
getInvestmentPolicy
simulateTrade
checkPolicy
```

숫자는 tool 결과를 사용한다.

---

## 15.2 Evidence Agent

질문:

> "외부에서 확인 가능한 사실은 무엇인가?"

Tools:

```text
getQuote
getPriceHistory
getStockWarnings
getRecentFilings
getFinancialStatements
getEtfHoldings
```

routing:

```text
한국 기업
→ OpenDART

미국 기업
→ SEC
```

---

## 15.3 LLM Critic

항상 호출하지 않는다.

필요할 때만 실행한다.

검사:

- unsupported claims
- missing evidence
- stale data
- policy inconsistency
- prediction as fact
- missing risk
- contradictory evidence

---

## 15.4 Synthesizer

최종 사용자 답변을 만든다.

입력:

- portfolio result
- evidence result
- simulation result
- policy result
- verification result

출력은 markdown string 하나가 아니라 structured JSON.

```ts
interface AgentAnswer {
  summary: string;

  evidence: EvidenceItem[];

  alternatives: Alternative[];

  risks: RiskItem[];

  costs: CostItem[];

  policyChecks: PolicyCheck[];

  recommendation: string;

  limitations: string[];
}
```

Frontend가 이를 section별로 render한다.

---

# 16. Jev: System-One Decision Model

Jev는 전체 Agent를 대체하지 않는다.

역할:

> workflow 내부의 빠르고 좁은 판단

구분:

```text
LLM
= reasoning + explanation

Jev
= routing + scoring + verification

Code
= calculation + constraints
```

---

# 17. Decision Model Abstraction

Jev에 시스템을 강결합하지 않는다.

```ts
interface DecisionModel {
  choice<T extends string>(
    state: unknown,
    choices: T[],
    question: string
  ): Promise<ChoiceDecision<T>>;

  score(
    state: unknown,
    criteria: ScoreCriteria
  ): Promise<ScoreDecision>;

  evaluate(
    state: unknown,
    statement: string
  ): Promise<ProbabilityDecision>;
}
```

구현:

```text
JevDecisionModel
LLMDecisionModel
```

Jev를 사용할 수 없는 경우 OpenAI / Claude structured-output 기반으로 동일 workflow 실행.

---

# 18. Jev Router

사용자:

> "NVDA 500만 원 더 살까?"

state:

```json
{
  "message": "NVDA 500만원 더 살까?",
  "hasPortfolio": true,
  "hasInvestmentPolicy": true,
  "symbolMentioned": "NVDA"
}
```

Jev에 하나의 거대한 질문을 하지 않는다.

Atomic decision:

```text
needs_portfolio_data?
needs_simulation?
needs_external_evidence?
needs_policy_check?
needs_risk_review?
```

예:

```json
{
  "needs_portfolio_data": 0.99,
  "needs_simulation": 0.98,
  "needs_external_evidence": 0.74,
  "needs_policy_check": 0.97,
  "needs_risk_review": 0.81
}
```

Graph는 코드가 결정한다.

Jev가 arbitrary workflow를 생성하게 하지 않는다.

---

# 19. Confidence-Based Escalation

Jev confidence를 활용한다.

```ts
if (decision.confidence >= ROUTING_THRESHOLD) {
  execute(decision);
} else {
  return llmPlanner.plan(state);
}
```

즉:

```text
easy decision
→ Jev

ambiguous decision
→ frontier LLM escalation
```

이 구조를 통해 adaptive orchestration을 구현한다.

---

# 20. Jev Verification

Synthesizer 답변 이후 atomic verification을 수행한다.

예:

```text
Does the answer contain unsupported claims?

Does the answer conflict with investment policy?

Does the answer present uncertain future performance as fact?

Is an important risk omitted?

Does the answer rely on stale data?
```

예:

```json
{
  "unsupported_claim": 0.08,
  "policy_conflict": 0.03,
  "prediction_as_fact": 0.05,
  "missing_material_risk": 0.31,
  "stale_evidence": 0.02
}
```

threshold 이상일 때만 LLM Critic을 실행한다.

```text
Jev Verification
      ↓
pass
      ↓
final answer

or

Jev Verification
      ↓
problem / uncertainty
      ↓
LLM Critic
      ↓
revision
      ↓
final answer
```

---

# 21. Orchestration Example

사용자:

> "요즘 NVDA 실적 좋다던데 500만원 더 살까?"

## Step 1

Jev routing:

```text
portfolio       YES
simulation      YES
evidence        YES
policy check    YES
deep critic     MAYBE
```

## Step 2

병렬 실행:

```text
                 ┌─ Portfolio Agent
                 │
Orchestrator ────┼─ Simulation Engine
                 │
                 └─ Evidence Agent
```

Portfolio Agent와 Evidence Agent는 dependency가 없다면 병렬 실행.

```ts
await Promise.all([
  runPortfolioAgent(),
  runEvidenceAgent(),
]);
```

Simulation도 필요한 data가 확보되는 즉시 실행.

## Step 3

Policy Engine.

```text
NVDA 11.2%
   ↓
16.7%

limit = 15%

VIOLATION
```

AI 사용하지 않음.

## Step 4

Synthesizer.

## Step 5

Jev verification.

## Step 6

문제가 없으면 반환.

문제가 있으면 LLM Critic → revision.

---

# 22. Simple Query Optimization

질문:

> "내가 가장 많이 가진 종목이 뭐야?"

workflow:

```text
Router
   ↓
Portfolio Tool
   ↓
Answer
```

Evidence Agent, Critic 등 호출하지 않는다.

목표:

> multi-agent를 많이 사용하는 것이 아니라  
> **필요할 때만 사용하는 것**

---

# 23. OpenAI / Claude Provider Registry

Agent마다 provider 선택 가능.

```ts
const agentConfig = {
  orchestratorFallback: {
    provider: "openai",
    model: process.env.ORCHESTRATOR_MODEL
  },

  portfolio: {
    provider: "openai",
    model: process.env.PORTFOLIO_MODEL
  },

  evidence: {
    provider: "anthropic",
    model: process.env.EVIDENCE_MODEL
  },

  critic: {
    provider: "anthropic",
    model: process.env.CRITIC_MODEL
  },

  synthesizer: {
    provider: "openai",
    model: process.env.SYNTHESIZER_MODEL
  }
};
```

Registry:

```ts
function getModel(config: ModelConfig) {
  if (config.provider === "openai") {
    return openai(config.model);
  }

  if (config.provider === "anthropic") {
    return anthropic(config.model);
  }

  throw new Error("Unsupported provider");
}
```

---

# 24. Agent Tools

초기 구현할 tool:

```text
getPortfolioSnapshot
getInvestmentPolicy

getQuotes
getPriceHistory
getStockWarnings

simulateTrade
simulateScenario
checkInvestmentPolicy

getRecentFilings
getFinancialStatements

getEtfHoldings
```

모든 tool input/output은 Zod schema로 검증한다.

---

# 25. Repository Structure

```text
investment-agent/
│
├── app/
│   ├── page.tsx
│   ├── assets/
│   │   └── page.tsx
│   ├── policy/
│   │   └── page.tsx
│   ├── agent/
│   │   └── page.tsx
│   ├── trace/
│   │   └── [runId]/
│   │       └── page.tsx
│   │
│   └── api/
│       ├── portfolio/
│       │   └── snapshot/
│       │       └── route.ts
│       ├── today/
│       │   └── route.ts
│       ├── simulate/
│       │   └── route.ts
│       ├── agent/
│       │   └── route.ts
│       └── settings/
│           └── models/
│               └── route.ts
│
├── src/
│   ├── domain/
│   │   ├── portfolio.ts
│   │   ├── policy.ts
│   │   ├── simulation.ts
│   │   ├── evidence.ts
│   │   └── agent.ts
│   │
│   ├── providers/
│   │   ├── finance/
│   │   │   ├── interface.ts
│   │   │   ├── toss.ts
│   │   │   └── mock-mydata.ts
│   │   │
│   │   ├── market/
│   │   │   ├── interface.ts
│   │   │   └── toss.ts
│   │   │
│   │   ├── disclosure/
│   │   │   ├── dart.ts
│   │   │   └── sec.ts
│   │   │
│   │   ├── etf/
│   │   │   ├── interface.ts
│   │   │   └── issuer.ts
│   │   │
│   │   └── llm/
│   │       └── registry.ts
│   │
│   ├── decision/
│   │   ├── interface.ts
│   │   ├── jev.ts
│   │   ├── llm-fallback.ts
│   │   └── schemas.ts
│   │
│   ├── services/
│   │   ├── portfolio-aggregator.ts
│   │   ├── exposure-engine.ts
│   │   ├── relevance-engine.ts
│   │   ├── simulation-engine.ts
│   │   ├── policy-engine.ts
│   │   └── evidence-service.ts
│   │
│   ├── tools/
│   │   ├── portfolio-tools.ts
│   │   ├── market-tools.ts
│   │   ├── simulation-tools.ts
│   │   └── evidence-tools.ts
│   │
│   ├── agents/
│   │   ├── portfolio-agent.ts
│   │   ├── evidence-agent.ts
│   │   ├── llm-critic.ts
│   │   ├── synthesizer.ts
│   │   └── prompts/
│   │
│   ├── orchestration/
│   │   ├── orchestrator.ts
│   │   ├── router.ts
│   │   ├── graph.ts
│   │   ├── runner.ts
│   │   ├── escalation.ts
│   │   └── tracer.ts
│   │
│   └── db/
│       ├── schema.ts
│       └── index.ts
│
├── fixtures/
│   ├── toss/
│   └── mydata/
│
├── public/
│   ├── manifest.webmanifest
│   └── icons/
│
├── tests/
│   ├── simulation/
│   ├── policy/
│   ├── orchestration/
│   └── evals/
│
├── .env.example
├── docker-compose.yml
└── README.md
```

---

# 26. API Design

## Portfolio Snapshot

```http
GET /api/portfolio/snapshot
```

response:

```json
{
  "asOf": "...",
  "accounts": [],
  "positions": [],
  "totals": {},
  "sources": []
}
```

---

## Today for Me

```http
GET /api/today
```

response:

```json
{
  "items": [
    {
      "type": "price_move",
      "title": "NVIDIA -7%",
      "portfolioImpactKRW": -312000,
      "importance": 0.91,
      "explanation": "...",
      "sources": []
    }
  ]
}
```

---

## Simulation

```http
POST /api/simulate
```

request:

```json
{
  "type": "trade",
  "symbol": "NVDA",
  "action": "buy",
  "amountKRW": 5000000
}
```

---

## Agent

```http
POST /api/agent
```

request:

```json
{
  "message": "NVDA 500만원 더 살까?"
}
```

SSE streaming 사용.

최종 structured answer를 stream하여 UI section을 점진적으로 render할 수 있다.

---

# 27. PWA

Frontend는 mobile-first responsive web app으로 만든다.

그리고 PWA를 추가한다.

기능:

- manifest
- home screen install
- standalone display
- service worker

초기 POC에서는 push notification은 필수 아님.

향후:

> "오늘 당신의 자산에 중요한 변화가 생겼어요."

형태의 notification으로 확장 가능.

## Cache Policy

cache:

- JS
- CSS
- icons
- static shell

cache하지 않음:

```text
/api/portfolio
/api/today
/api/agent
/api/simulate
```

금융 데이터는 stale cache로 보여주지 않는다.

---

# 28. Mobile UI

bottom navigation:

```text
┌───────────────────────┐
│       My AI PB        │
│                       │
│ 오늘 내 돈에          │
│ 중요한 변화 3개       │
│                       │
│ ① NVDA                │
│ ② 환율                │
│ ③ 삼성전자            │
│                       │
│ Ask your PB...        │
│                       │
├───────────────────────┤
│ Home  Assets  AI  Me  │
└───────────────────────┘
```

Pages:

### Home

Today for Me.

### Assets

분석 대상 자산.

LIVE / DEMO 표시.

### AI

Agent + simulation.

### Me

Investment Policy.

### Developer Trace

일반 navigation에서는 숨김.

Developer Mode에서만 접근.

---

# 29. Agent Trace

포트폴리오 프로젝트에서 중요한 기술적 기능.

예:

```text
Run #1042

User
"NVDA 500만원 더 살까?"

────────────────────

ROUTING

Jev
92 ms

Portfolio             99%
Simulation            98%
Evidence              74%
Policy Check          97%
Deep Critic           21%

────────────────────

EXECUTION

Portfolio Agent
Provider: OpenAI

Simulation Engine
Type: deterministic

Evidence Agent
Provider: Anthropic

Portfolio + Evidence
executed in parallel

────────────────────

POLICY

single stock max
15%

simulated
16.7%

VIOLATION

────────────────────

VERIFICATION

Jev

Unsupported claim      3%
Missing risk          14%
Policy conflict        1%
Prediction as fact     5%

LLM Critic
SKIPPED

────────────────────

TOTAL

Jev calls:      2
LLM calls:      3
Tool calls:     6

Agents avoided: 1
```

저장할 정보:

```ts
interface AgentRun {
  id: string;

  userMessage: string;

  startedAt: string;
  finishedAt?: string;

  llmCalls: number;
  decisionCalls: number;
  toolCalls: number;

  inputTokens?: number;
  outputTokens?: number;

  latencyMs?: number;
  estimatedCost?: number;
}
```

---

# 30. Security

절대 frontend에 노출하지 않는다.

- Toss client secret
- Toss access token
- account identifier
- OpenAI API key
- Anthropic API key
- DART API key

Architecture:

```text
Browser
   ↓
Backend
   ↓
External APIs
```

금지:

```text
Browser
   ↓
Toss/OpenAI/Claude
```

LLM에는 필요한 최소 데이터만 보낸다.

예:

```json
{
  "symbol": "NVDA",
  "marketValueKRW": 9300000,
  "portfolioWeight": 11.2
}
```

실제 계좌번호 등은 전달하지 않는다.

---

# 31. Toss API Infrastructure

Toss Open API의 credential은 backend에서만 관리.

배포 환경은 고정 outbound IP를 사용하는 것이 좋다.

간단한 POC:

```text
VM / EC2
  +
Static IP
  +
Docker
  +
Caddy HTTPS
```

Frontend와 backend를 같은 deployment에서 실행해도 된다.

---

# 32. Environment Variables

`.env.example`

```bash
APP_MODE=demo

# OpenAI
OPENAI_API_KEY=
ORCHESTRATOR_MODEL=
PORTFOLIO_MODEL=
SYNTHESIZER_MODEL=

# Anthropic
ANTHROPIC_API_KEY=
EVIDENCE_MODEL=
CRITIC_MODEL=

# Decision Model
DECISION_PROVIDER=jev
TYPESAFE_API_KEY=
JEV_MODEL=

# Toss Securities
TOSS_CLIENT_ID=
TOSS_CLIENT_SECRET=

# DART
DART_API_KEY=

# SEC
SEC_USER_AGENT=

# DB
DATABASE_URL=file:./data/app.db

# Feature Flags
ENABLE_REAL_TOSS=true
ENABLE_MOCK_MYDATA=true
ENABLE_EXTERNAL_EVIDENCE=true
ENABLE_AGENT_TRACE=true
```

---

# 33. Missing Data Policy

데이터가 없으면 만들어내지 않는다.

예:

```text
현재 ETF의 최신 구성 종목 데이터를 가져오지 못했습니다.

따라서 이번 NVIDIA exposure 계산에서는
ETF 내부 보유량을 제외했습니다.
```

또는:

```text
현재 가격 데이터는 15분 지연된 데이터입니다.
```

Agent가 추정치를 채워 넣지 않는다.

---

# 34. Failure Handling

각 provider는 오류를 normalization 한다.

```ts
type DataProviderError =
  | "AUTH_FAILED"
  | "RATE_LIMITED"
  | "NOT_AVAILABLE"
  | "STALE_DATA"
  | "NETWORK_ERROR"
  | "UNKNOWN";
```

Agent에게 raw API error message를 던지지 않는다.

Service가 사용자에게 의미 있는 상태로 변환한다.

---

# 35. 구현 순서

이 순서대로 구현한다.

## Phase 1 — Project Skeleton

1. Next.js 생성
2. TypeScript
3. Tailwind
4. shadcn/ui
5. Drizzle + SQLite
6. `.env.example`
7. Docker

완료 조건:

- 로컬 실행 가능
- DB migration 가능
- 모바일 responsive shell 존재

---

## Phase 2 — Domain Layer

구현:

- Account
- Position
- PortfolioSnapshot
- InvestmentPolicy
- SimulationResult
- Evidence
- AgentAnswer

완료 조건:

- external API type이 domain에 직접 노출되지 않음

---

## Phase 3 — Mock Portfolio

먼저 MockMyDataProvider 구현.

샘플:

- Toss Brokerage
- Samsung Securities
- Meritz IRP
- DC Pension

이 단계에서 실제 API 없이 전체 제품 UX 개발 가능.

---

## Phase 4 — Toss Integration

구현:

- authentication
- account
- holdings
- quotes
- price history
- buying power
- commissions
- market info

완료 조건:

- Toss 계좌를 PortfolioSnapshot으로 normalization 가능
- UI에 LIVE 표시

---

## Phase 5 — Investment Policy

CRUD UI.

Policy Engine 구현.

Test 필수.

---

## Phase 6 — Exposure Engine

구현:

- direct exposure
- sector
- currency
- country
- ETF look-through

초기 ETF 몇 개만 지원 가능.

---

## Phase 7 — Simulation Engine

구현:

- buy
- sell
- stock scenario
- FX scenario

Policy Engine 연결.

Test coverage 확보.

---

## Phase 8 — Today for Me

구현:

1. candidate event 생성
2. financial impact 계산
3. Jev relevance evaluation
4. top-N ranking
5. LLM explanation

---

## Phase 9 — LLM Provider Layer

구현:

- OpenAI
- Anthropic

공통 interface.

Structured output.

---

## Phase 10 — Agent Tools

구현:

- portfolio
- market
- simulation
- evidence

Zod validation.

---

## Phase 11 — Agents

구현 순서:

1. Portfolio Agent
2. Evidence Agent
3. Synthesizer
4. LLM Critic

---

## Phase 12 — Jev Decision Layer

구현:

- DecisionModel interface
- JevDecisionModel
- LLMDecisionModel fallback

atomic questions만 사용.

---

## Phase 13 — Orchestrator

구현:

- routing
- graph building
- dependency resolution
- parallel execution
- escalation
- verification
- synthesis

---

## Phase 14 — Trace

DB:

- agent_runs
- agent_steps
- tool_calls

UI:

- routing decision
- agents
- tools
- parallel execution
- confidence
- latency
- tokens
- cost
- skipped agents

---

## Phase 15 — External Evidence

구현:

- OpenDART
- SEC
- ETF holdings

---

## Phase 16 — PWA

구현:

- manifest
- icons
- service worker
- installability

API response cache 금지.

---

## Phase 17 — Deployment

- Docker
- VM
- static IP
- HTTPS
- secrets
- monitoring

---

# 36. Tests

## Unit Tests

필수:

- Policy Engine
- Simulation Engine
- Exposure Engine
- portfolio normalization
- routing threshold

---

## Integration Tests

- Toss fixture → PortfolioSnapshot
- mock MyData → PortfolioSnapshot
- simulate → policy
- portfolio + evidence → synthesizer

---

# 37. Eval Dataset

최소 20~50개의 golden query 작성.

예:

| Query | Expected workflow |
|---|---|
| 내가 제일 많이 가진 종목은? | portfolio only |
| NVDA 500만원 더 사면? | portfolio + simulation + policy |
| NVDA 왜 떨어졌어? | market/evidence |
| NVDA 더 살까? | full decision flow |
| 삼성전자 오를까? | prediction refusal/uncertainty |
| ETF 안의 NVDA 비중은? | ETF tool |
| 환율 -10%면? | scenario simulation |
| 데이터 언제 기준이야? | provenance |
| ETF data 없음 | missing-data handling |
| single stock limit 초과 | policy violation |

---

# 38. Evaluation Metrics

## Financial Correctness

- calculation accuracy
- policy violation recall
- exposure accuracy

## Agent Quality

- unsupported claim rate
- evidence coverage
- source/provenance coverage
- uncertainty disclosure

## Orchestration

- routing accuracy
- tool selection accuracy
- unnecessary agent invocation rate
- escalation precision
- escalation recall

## Efficiency

- LLM calls/query
- Jev calls/query
- tool calls/query
- latency
- tokens
- estimated cost

---

# 39. Jev-specific Evaluation

## Calibration

confidence bucket별 실제 routing accuracy 측정.

예:

```text
0.9–1.0 → 97%
0.7–0.9 → 86%
<0.7    → 61%
```

이 데이터를 이용해 escalation threshold 설정.

---

## Adaptive vs Full Multi-Agent

비교 실험:

| Metric | Full Multi-Agent | Adaptive |
|---|---:|---:|
| Quality | - | - |
| LLM calls | - | - |
| latency | - | - |
| cost | - | - |
| unsupported claim | - | - |

목표:

> 품질을 거의 유지하면서  
> unnecessary LLM invocation을 줄이는 것

---

# 40. README에서 강조할 기술 포인트

README의 핵심 문장:

```text
Personal Investment Intelligence Agent

A multi-agent investment intelligence layer
built on top of brokerage and financial APIs.

Instead of predicting asset prices,
the system simulates how investment decisions
change a user's portfolio.

The architecture separates:

- deterministic financial computation
- fast System-One decision models
- frontier LLM reasoning
```

핵심 기술:

```text
Simulation over Prediction

Evidence-grounded Responses

Personal Investment Policy

Cross-account Portfolio Aggregation

Deterministic Financial Tools

Provider-Agnostic Multi-Agent Runtime

Jev-based Adaptive Routing

Confidence-based LLM Escalation

Critic-based Verification

Explicit Data Provenance

Agent Tracing
```

---

# 41. 이 프로젝트에서 보여주고 싶은 엔지니어링 역량

이 프로젝트를 단순 금융 챗봇처럼 보이지 않게 한다.

보여주려는 것은 다음이다.

## Product Engineering

기존 brokerage 기능을 다시 만들지 않고
기존 데이터 위에 새로운 사용자 가치를 추가한다.

## Financial System Design

금융 계산과 LLM reasoning을 분리한다.

## Multi-Agent Orchestration

여러 agent를 그냥 연결하는 것이 아니라
질문에 따라 필요한 agent만 실행한다.

## Adaptive Decision Policy

System-One decision model과 frontier model을
task complexity / uncertainty에 따라 선택한다.

## Verification

LLM output을 그대로 신뢰하지 않고
verification + critic escalation을 둔다.

## Observability

agent execution trace와
latency/cost/tool usage를 기록한다.

---

# 42. Non-Goals

초기 POC에서 하지 않는다.

- 실제 주식 주문
- 자동매매
- portfolio optimization algorithm
- 미래 가격 prediction
- 모든 증권사 직접 API integration
- 실제 MyData 사업자 연동
- full robo-advisor
- tax optimization
- 모든 ETF 지원
- 모든 금융상품 지원

이 범위를 지켜야 POC가 흐려지지 않는다.

---

# 43. Definition of Done

POC는 다음 조건을 만족하면 완료로 본다.

## Data

- Toss Open API 실제 계좌 조회 가능
  - 불가능한 경우 demo fallback 가능
- Mock MyData 계좌 표시
- LIVE/DEMO 명확히 구분

## Product

- Investment Policy 설정
- Today for Me
- What-if Simulation
- Agent conversation

## Agent

- OpenAI / Claude 선택 가능
- multi-agent orchestration
- parallel agent execution
- Jev routing
- confidence escalation
- Jev verification
- optional LLM critic

## Trust

- Evidence 표시
- provenance 표시
- stale/missing data 표시
- policy violation 표시
- prediction과 simulation 명확히 구분

## Engineering

- Agent trace
- eval dataset
- orchestration metrics
- Docker deployment
- mobile PWA

---

# 44. 최종 프로젝트 설명

이 프로젝트는:

> **토스증권과 같은 brokerage가 이미 보유한 계좌/시장 데이터 위에서  
> 사용자의 여러 투자계좌와 생애주기 투자 원칙을 이해하고,  
> 시장의 변화를 개인에게 중요한 정보로 변환하며,  
> 투자 행동 전에 결과를 deterministic하게 시뮬레이션하고,  
> 근거와 불확실성을 분리해 설명하는 Personal Investment Intelligence Agent**

이다.

동시에 기술적으로는:

> **LLM, System-One decision model, deterministic financial engine을 분리하고  
> task와 uncertainty에 따라 필요한 intelligence만 선택적으로 사용하는  
> provider-agnostic adaptive multi-agent orchestration system**

을 구현한다.

이 프로젝트의 목표는
"AI가 무엇을 살지 알려주는 서비스"가 아니라

> **"내 돈을 이해하고, 내가 정한 원칙을 기억하며,  
> 행동하기 전에 결과를 보여주고,  
> 판단의 근거와 불확실성을 설명하는 AI PB"**

를 만드는 것이다.

---

# 45. 2026-09-22 구현 보강 결과

면접 리뷰에서 우선 지적될 수 있는 계산 정확성, 사용자 격리, multi-turn memory, baseline 부재를 다음과 같이 코드와 테스트에 반영했다.

## 45.1 핵심 계산 정확성

- 하나의 agent run은 최초에 읽은 `PortfolioSnapshot`, `InvestmentPolicy`, ETF exposure를 시뮬레이션까지 재사용한다. 분석 중 재조회로 서로 다른 시점의 숫자가 섞이지 않는다.
- 매수 필요 현금이 투자 가능 금액보다 크면 신규 입금을 암묵적으로 가정하거나 음수 현금을 만들지 않고 `SimulationError`로 거절한다.
- Toss 계좌는 `/commissions`의 계좌별 수수료율을 사용하며, 조회 실패 시에만 기본 스케줄과 limitation을 사용한다.
- 실데이터에 `buyRateKRW`가 있으면 매매기준율과의 차이를 실제 환전 비용으로 계산한다. 데모처럼 매수환율이 없을 때만 명시된 기본 spread를 사용한다.
- 국내 매도 거래세 스케줄은 주식에만 적용하고 KR 상장 ETF에는 동일 세율을 잘못 적용하지 않는다.
- 외부 provider 결과는 최종 `PortfolioSnapshot` Zod 경계에서 검증한다.
- Toss `ACCOUNT` 호출은 계좌 결과를 재사용하고 순차 실행하며, OAuth token 발급은 single-flight로 묶고 401은 한 번만 재발급 후 재시도한다.

회귀 검증은 `tests/simulation/simulation-engine.test.ts`와 portfolio/orchestrator 테스트가 담당한다.

## 45.2 사용자 격리

- `proxy.ts`가 HttpOnly, SameSite=Lax anonymous session id를 발급한다.
- 정책 row key, conversation id, portfolio/today cache, agent tools, simulation context, agent trace가 모두 동일한 `userId` namespace를 사용한다.
- `/trace` 목록과 상세는 현재 사용자 trace만 조회한다.
- `agent_runs.user_id` migration을 추가했다.
- `tests/services/user-isolation.test.ts`가 두 사용자의 정책과 대화가 섞이지 않음을 검증한다.

이것은 POC tenant boundary다. 실제 운영에서는 anonymous cookie를 인증된 사용자 subject로 교체하고 Toss/MyData 자격증명도 사용자별 vault에 연결해야 한다.

## 45.3 Multi-turn memory

- agent 요청 전에 같은 사용자·conversation의 최근 12개 turn을 읽는다.
- assistant 응답 전체 JSON 대신 `summary + recommendation`만 compact memory로 전달한다.
- Router, Portfolio Agent, Evidence Agent, Synthesizer가 동일한 최근 대화를 받는다.
- deterministic parser도 대명사와 축약 후속 질문을 처리한다. 예: `NVDA 500만원 더 살까?` 다음의 `그중 절반만 사면?`은 `NVDA 250만원 매수`로 해석한다.
- message 조회는 오래된 50개가 아니라 최신 N개를 가져온 뒤 시간순으로 복원한다.

장기 semantic memory나 vector DB는 현재 요구에 필요하지 않아 추가하지 않았다. 사용자 선호의 장기 추출이 검증된 요구가 될 때 별도 memory policy와 함께 도입한다.

## 45.4 Baseline 대비 eval

30개 golden query 각각에 8개 routing output 전체를 라벨링하고, adaptive router와 모든 specialist를 실행하는 always-on baseline을 exact workflow match로 비교한다. 일부 필드만 비교해 정확도를 부풀리는 방식은 사용하지 않는다.

| 2026-09-22 재현 결과 | Exact workflow match |
|---|---:|
| Adaptive rule router | **100.0% (30/30)** |
| Always-on orchestration baseline | **16.7% (5/30)** |

실행 명령:

```bash
npx vitest run tests/evals/routing-eval.test.ts --disableConsoleIntercept --reporter=verbose
```

이 결과는 routing workflow 선택 정확도이며 최종 답변 품질 점수가 아니다. provider key와 사람 검수 answer label이 준비되면 single-agent 대 multi-agent의 groundedness, policy consistency, unsupported-claim rate, p95 latency, token cost를 별도 live eval로 기록한다.
