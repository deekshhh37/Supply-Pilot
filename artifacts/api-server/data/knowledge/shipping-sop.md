# Shipping Standard Operating Procedures (SOP)

## Shipment Processing

### Standard Shipment Flow
1. Purchase order confirmed → Warehouse team notified
2. Pick-and-pack initiated within 2 hours of PO confirmation
3. Quality check completed before dispatch
4. Carrier assigned based on weight, destination, and SLA
5. Tracking number generated and shared with customer within 1 hour of dispatch

### Carrier Selection Matrix
- **Ground (<500 miles, non-urgent)**: Standard carrier, 2-3 day transit
- **Ground (>500 miles, non-urgent)**: Regional carrier, 3-5 day transit
- **Expedited Ground**: Next-day or 2-day service, 30% premium
- **Air Freight (Domestic)**: Same-day to next-day, 150% premium over ground
- **Air Freight (International)**: 1-3 days, requires customs documentation
- **Sea Freight**: 15-45 days, for bulk non-urgent international shipments

### Route Risk Assessment
- Monitor weather alerts 72 hours before dispatch for ground routes
- Port congestion alerts checked daily for sea freight
- Air freight routing reviewed for storm warnings and airspace restrictions
- Alternative routes pre-approved for all Platinum customer shipments

### Delay Response Procedures
When transit delay is detected:
1. Customer notified within 2 hours of delay identification
2. ETA recalculated using carrier API + weather data
3. If new ETA breaches SLA: alternative fulfillment options evaluated
4. Rerouting authorized for delays >24 hours affecting SLA-critical shipments

### Weather Disruption Protocol
- **Severity Level 1 (Minor)**: Monitor and flag, no action required
- **Severity Level 2 (Moderate)**: Pre-position stock, notify customers, prepare alternate routes
- **Severity Level 3 (Severe)**: Activate emergency rerouting, air freight escalation, customer SLA review
- Port closures: Immediate diversion to alternative port, air freight for critical items

### Split Shipment Authorization
- Authorized when full shipment would breach customer SLA by >24 hours
- Partial shipment dispatched from nearest available stock location
- Customer notified of split shipment plan and individual tracking numbers
