# Customer Priority Matrix

## Customer Tier Definitions

### Platinum Tier
- **Annual Revenue**: >$5M or strategic partnership designation
- **SLA**: 99.5% on-time delivery, <24-hour response to issues
- **Features**: Dedicated account manager, priority fulfillment, reserved stock allocation, real-time tracking
- **Delay Tolerance**: Zero — any delay triggers immediate escalation
- **Examples**: Fortune 500 retailers, national pharmacy chains, critical infrastructure

### Gold Tier
- **Annual Revenue**: $1M-$5M
- **SLA**: 98% on-time delivery, <48-hour response to issues
- **Features**: Priority fulfillment, next-day escalation for delays >24 hours
- **Delay Tolerance**: Up to 24 hours before customer notification required
- **Examples**: Regional retailers, mid-size manufacturers, healthcare distributors

### Silver Tier
- **Annual Revenue**: $250K-$1M
- **SLA**: 95% on-time delivery, <72-hour response to issues
- **Features**: Standard fulfillment, automated delay notifications
- **Delay Tolerance**: Up to 48 hours before escalation
- **Examples**: Small businesses, specialty retailers, wholesale buyers

### Bronze Tier
- **Annual Revenue**: <$250K
- **SLA**: 90% on-time delivery, standard response times
- **Features**: Self-service tracking, automated notifications
- **Delay Tolerance**: Up to 72 hours

## Priority Scoring for Demand Allocation
When inventory is constrained, fulfillment priority follows this weighted score:
- Tier weight: Platinum=100, Gold=75, Silver=50, Bronze=25
- Order age bonus: +5 points per day order is waiting
- SLA urgency: +30 points if delivery is within SLA window
- Historical loyalty: +10 points for customers with >2 years tenure

## Business Impact Calculation
- **Platinum stockout**: $50,000+ revenue risk + reputational damage
- **Gold stockout**: $10,000-$50,000 revenue risk
- **Silver stockout**: $2,500-$10,000 revenue risk
- **Bronze stockout**: <$2,500 revenue risk

## SLA Penalty Structure
- 1-24 hours late: 5% order value credit
- 24-48 hours late: 10% order value credit
- >48 hours late: 20% order value credit + executive review
- Platinum customers: All penalties doubled, plus dedicated remediation plan
