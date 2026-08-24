// Central Mock Data — APS Enterprise
// Used as default/fallback data in all pages so UI always shows data

export const MOCK_LEADS = [
  { id: 'LEAD-001', name: 'Priya Soni', company: 'Jain Disposables', phone: '+919231421392', email: 'priya@jaindisposables.com', interest: 'Single Die Paper Plate Making Machine', budget: '345231', stage: 'Booked', priority: 'Hot', notes: 'Lead generated via IndiaMart from Hyderabad.', source: 'Inbound Call', crmSynced: true, erpBookingCreated: true, tallyPaymentVerified: false, assignedEmployeeId: 'e7', createdAt: '2026-06-26T09:24:01.735Z' },
  { id: 'LEAD-002', name: 'Ishaan Verma', company: 'Pandey Solutions', phone: '+919355796869', email: 'ishaan@pandeysolutions.in', interest: 'Heavy Duty Hydraulic Paper Plate Press', budget: '178077', stage: 'Client (Paid)', priority: 'Hot', notes: 'Lead generated via Telecaller from Hyderabad.', source: 'A1 Voice Agent', crmSynced: true, erpBookingCreated: true, tallyPaymentVerified: true, assignedEmployeeId: 'e13', createdAt: '2026-02-26T09:24:01.735Z' },
  { id: 'LEAD-003', name: 'Manish Yadav', company: 'Sinha Packaging', phone: '+919662396059', email: 'manish@sinhapack.com', interest: 'Heavy Duty Hydraulic Paper Plate Press', budget: '286032', stage: 'Dispatched', priority: 'Warm', notes: 'Lead generated via Meta Ads from Ahmedabad.', source: 'Inbound Call', crmSynced: true, erpBookingCreated: true, tallyPaymentVerified: true, assignedEmployeeId: 'e17', createdAt: '2026-04-30T09:24:01.735Z' },
  { id: 'LEAD-004', name: 'Animesh Jain', company: 'Nair Industries', phone: '+919537102989', email: 'animesh@nairinds.com', interest: 'Paper Lamination Machine', budget: '412000', stage: 'Confirmed Lead', priority: 'Hot', notes: 'High-value client. Payment gate pending.', source: 'Meta Ads', crmSynced: true, erpBookingCreated: false, tallyPaymentVerified: false, assignedEmployeeId: 'e1', createdAt: '2026-05-10T09:24:01.735Z' },
  { id: 'LEAD-005', name: 'Sunita Sharma', company: 'Apex Packaging', phone: '+919876543210', email: 'sunita@apexpack.in', interest: 'Fully Automatic Paper Cup Machine', budget: '225000', stage: 'Qualified', priority: 'Warm', notes: 'Demo scheduled for next week.', source: 'WhatsApp', crmSynced: true, erpBookingCreated: false, tallyPaymentVerified: false, assignedEmployeeId: 'e3', createdAt: '2026-07-01T09:24:01.735Z' },
  { id: 'LEAD-006', name: 'Rajesh Gupta', company: 'Gupta Disposables', phone: '+919812345678', email: 'rajesh@guptadisposables.com', interest: 'Double Die Paper Plate Machine', budget: '190000', stage: 'Enquiry', priority: 'Cold', notes: 'First contact via cold call.', source: 'A1 Voice Agent', crmSynced: true, erpBookingCreated: false, tallyPaymentVerified: false, assignedEmployeeId: 'e5', createdAt: '2026-08-01T09:24:01.735Z' },
  { id: 'LEAD-007', name: 'Neha Patel', company: 'Patel Enterprises', phone: '+919923456789', email: 'neha@patelenterprises.in', interest: 'Semi-Automatic Dona Making Machine', budget: '95000', stage: 'In Production', priority: 'Hot', notes: 'Production started. Delivery in 3 weeks.', source: 'Meta Ads', crmSynced: true, erpBookingCreated: true, tallyPaymentVerified: true, assignedEmployeeId: 'e9', createdAt: '2026-03-15T09:24:01.735Z' },
  { id: 'LEAD-008', name: 'Vikram Singh', company: 'Singh Polymers', phone: '+919834567890', email: 'vikram@singhpolymers.com', interest: 'Non-Woven Bag Making Machine', budget: '320000', stage: 'Booked', priority: 'Hot', notes: 'Order confirmed. Awaiting 10% advance.', source: 'Inbound Call', crmSynced: true, erpBookingCreated: true, tallyPaymentVerified: false, assignedEmployeeId: 'e2', createdAt: '2026-06-01T09:24:01.735Z' },
  { id: 'LEAD-009', name: 'Kavya Reddy', company: 'Reddy Paper Products', phone: '+919745678901', email: 'kavya@reddypapers.in', interest: 'Crank Type Paper Plate Machine', budget: '75000', stage: 'Qualified', priority: 'Warm', notes: 'Interested in bulk order discount.', source: 'WhatsApp', crmSynced: true, erpBookingCreated: false, tallyPaymentVerified: false, assignedEmployeeId: 'e6', createdAt: '2026-07-20T09:24:01.735Z' },
  { id: 'LEAD-010', name: 'Arjun Mehta', company: 'Mehta Manufacturing', phone: '+919856789012', email: 'arjun@mehtamfg.com', interest: 'Hydraulic Dona Pattal Machine', budget: '450000', stage: 'Client (Paid)', priority: 'Hot', notes: 'Payment received. In production queue.', source: 'A1 Voice Agent', crmSynced: true, erpBookingCreated: true, tallyPaymentVerified: true, assignedEmployeeId: 'e4', createdAt: '2026-01-10T09:24:01.735Z' },
  { id: 'LEAD-011', name: 'Pooja Sharma', company: 'Sharma Plastics', phone: '+919967890123', email: 'pooja@sharmaплас.in', interest: 'Paper Bag Making Machine', budget: '185000', stage: 'Confirmed Lead', priority: 'Hot', notes: 'Decision maker confirmed. Payment pending.', source: 'Meta Ads', crmSynced: true, erpBookingCreated: false, tallyPaymentVerified: false, assignedEmployeeId: 'e8', createdAt: '2026-07-05T09:24:01.735Z' },
  { id: 'LEAD-012', name: 'Deepak Kumar', company: 'Kumar Packaging', phone: '+919878901234', email: 'deepak@kumarpack.com', interest: 'Agarbatti Making Machine', budget: '120000', stage: 'Dispatched', priority: 'Warm', notes: 'Dispatched on 15th Aug. Delivered.', source: 'Inbound Call', crmSynced: true, erpBookingCreated: true, tallyPaymentVerified: true, assignedEmployeeId: 'e11', createdAt: '2026-02-15T09:24:01.735Z' },
  { id: 'LEAD-013', name: 'Ritu Agarwal', company: 'Agarwal Creations', phone: '+919789012345', email: 'ritu@agarwalcreations.in', interest: '4-Die Dona Pattal Machine', budget: '280000', stage: 'In Production', priority: 'Hot', notes: 'Custom configuration required.', source: 'WhatsApp', crmSynced: true, erpBookingCreated: true, tallyPaymentVerified: true, assignedEmployeeId: 'e14', createdAt: '2026-04-01T09:24:01.735Z' },
  { id: 'LEAD-014', name: 'Suresh Tiwari', company: 'Tiwari Enterprises', phone: '+919690123456', email: 'suresh@tiwarienterprises.com', interest: 'Single Die Paper Plate Making Machine', budget: '165000', stage: 'Enquiry', priority: 'Cold', notes: 'Budget constraints. Follow up in 2 weeks.', source: 'A1 Voice Agent', crmSynced: true, erpBookingCreated: false, tallyPaymentVerified: false, assignedEmployeeId: 'e5', createdAt: '2026-08-10T09:24:01.735Z' },
  { id: 'LEAD-015', name: 'Alok Mishra', company: 'Mishra Industries', phone: '+919901234567', email: 'alok@mishrain.com', interest: 'Heavy Duty Hydraulic Paper Plate Press', budget: '395000', stage: 'Client (Paid)', priority: 'Hot', notes: 'Top priority client. Quality check in progress.', source: 'Meta Ads', crmSynced: true, erpBookingCreated: true, tallyPaymentVerified: true, assignedEmployeeId: 'e2', createdAt: '2026-01-20T09:24:01.735Z' },
];

export const MOCK_ACTIVITY_LOGS = [
  { id: 'log-001', leadId: 'LEAD-001', employeeId: 'e1', employeeName: 'Animesh (Sales)', action: 'Lead status transitioned from "Enquiry" to "Qualified"', fromStage: 'Enquiry', toStage: 'Qualified', createdAt: '2026-08-24T08:30:00.000Z' },
  { id: 'log-002', leadId: 'LEAD-002', employeeId: 'e2', employeeName: 'Bhavya (Admin)', action: 'Lead status transitioned from "Qualified" to "Booked"', fromStage: 'Qualified', toStage: 'Booked', createdAt: '2026-08-24T09:15:00.000Z' },
  { id: 'log-003', leadId: 'LEAD-003', employeeId: 'e3', employeeName: 'Aaditya (Ops)', action: 'Lead status transitioned from "Confirmed Lead" to "Client (Paid)"', fromStage: 'Confirmed Lead', toStage: 'Client (Paid)', createdAt: '2026-08-24T10:00:00.000Z' },
  { id: 'log-004', leadId: 'LEAD-004', employeeId: 'e1', employeeName: 'Animesh (Sales)', action: 'New Lead "Animesh Jain" created in CRM Board (Stage: Enquiry)', fromStage: 'None', toStage: 'Enquiry', createdAt: '2026-08-23T14:00:00.000Z' },
  { id: 'log-005', leadId: 'LEAD-007', employeeId: 'e2', employeeName: 'Bhavya (Admin)', action: 'Lead status transitioned from "Client (Paid)" to "In Production"', fromStage: 'Client (Paid)', toStage: 'In Production', createdAt: '2026-08-23T11:30:00.000Z' },
  { id: 'log-006', leadId: 'LEAD-010', employeeId: 'e4', employeeName: 'Pooja (Telecaller)', action: 'Tally 10% advance payment verified — ₹45,000 received', fromStage: 'Confirmed Lead', toStage: 'Client (Paid)', createdAt: '2026-08-22T16:00:00.000Z' },
  { id: 'log-007', leadId: 'LEAD-012', employeeId: 'e11', employeeName: 'Rahul (Dispatch)', action: 'Lead status transitioned from "In Production" to "Dispatched"', fromStage: 'In Production', toStage: 'Dispatched', createdAt: '2026-08-21T13:45:00.000Z' },
  { id: 'log-008', leadId: 'LEAD-015', employeeId: 'e2', employeeName: 'Bhavya (Admin)', action: 'ERP Booking created — Factory release authorized', fromStage: 'Booked', toStage: 'Confirmed Lead', createdAt: '2026-08-20T10:20:00.000Z' },
];

export const MOCK_EMPLOYEES = [
  { id: 'e1', name: 'Animesh Kumar', role: 'Sales Lead', email: 'animesh@apsenterprises.com', phone: '+91 98765 43210', department: 'Sales', status: 'Active', leadsAssigned: 45, leadsConverted: 28, revenue: 1250000, callsToday: 12, tasksCompleted: 8, performance: 92 },
  { id: 'e2', name: 'Bhavya Chaturvedi', role: 'Admin', email: 'bhavya@apsenterprises.com', phone: '+91 87654 32109', department: 'Operations', status: 'Active', leadsAssigned: 30, leadsConverted: 22, revenue: 980000, callsToday: 5, tasksCompleted: 15, performance: 96 },
  { id: 'e3', name: 'Aaditya Pathak', role: 'Operations Manager', email: 'aaditya@apsenterprises.com', phone: '+91 76543 21098', department: 'Operations', status: 'Active', leadsAssigned: 25, leadsConverted: 18, revenue: 820000, callsToday: 8, tasksCompleted: 10, performance: 88 },
  { id: 'e4', name: 'Pooja Sharma', role: 'Telecaller', email: 'pooja@apsenterprises.com', phone: '+91 65432 10987', department: 'Voice Operations', status: 'Active', leadsAssigned: 60, leadsConverted: 32, revenue: 650000, callsToday: 22, tasksCompleted: 18, performance: 85 },
  { id: 'e5', name: 'Rahul Singh', role: 'Telecaller', email: 'rahul@apsenterprises.com', phone: '+91 54321 09876', department: 'Voice Operations', status: 'Active', leadsAssigned: 55, leadsConverted: 28, revenue: 580000, callsToday: 18, tasksCompleted: 14, performance: 80 },
  { id: 'e6', name: 'Priya Verma', role: 'Field Sales Executive', email: 'priya@apsenterprises.com', phone: '+91 91234 56789', department: 'Sales', status: 'Active', leadsAssigned: 38, leadsConverted: 20, revenue: 720000, callsToday: 6, tasksCompleted: 9, performance: 83 },
  { id: 'e7', name: 'Amit Gupta', role: 'Assembly Supervisor', email: 'amit@apsenterprises.com', phone: '+91 98901 23456', department: 'Production', status: 'Active', leadsAssigned: 0, leadsConverted: 0, revenue: 0, callsToday: 0, tasksCompleted: 12, performance: 94 },
  { id: 'e8', name: 'Sneha Patel', role: 'Quality Testing', email: 'sneha@apsenterprises.com', phone: '+91 87890 12345', department: 'Production', status: 'Active', leadsAssigned: 0, leadsConverted: 0, revenue: 0, callsToday: 0, tasksCompleted: 20, performance: 97 },
];

export const MOCK_BOOKINGS = MOCK_LEADS
  .filter(l => ['Booked','Confirmed Lead','Client (Paid)','In Production','Dispatched'].includes(l.stage))
  .map((l, i) => ({
    id: `BK-2026-${String(1000 + i).padStart(4, '0')}`,
    leadId: l.id,
    clientName: l.name,
    company: l.company,
    product: l.interest,
    amount: parseFloat(l.budget),
    stage: l.stage,
    status: l.stage === 'Booked' ? 'Booking Created'
          : l.stage === 'Confirmed Lead' ? 'Confirmed'
          : l.stage === 'Client (Paid)' ? 'Factory Released'
          : l.stage === 'In Production' ? 'In Production'
          : 'Dispatched',
    erpRef: `ERP-APS-${2000 + i}`,
    createdAt: l.createdAt,
    assignedEmployeeId: l.assignedEmployeeId,
  }));

export const MOCK_PAYMENTS = MOCK_LEADS
  .filter(l => ['Confirmed Lead','Client (Paid)','In Production','Dispatched'].includes(l.stage))
  .map((l, i) => ({
    id: `PAY${String(i + 1).padStart(3, '0')}`,
    leadId: l.id,
    lead: l.name,
    company: l.company,
    amount: `₹${Math.round(parseFloat(l.budget) * 0.10).toLocaleString('en-IN')}`,
    percent: '10%',
    status: l.stage !== 'Confirmed Lead' ? 'Verified' : 'Pending Verification',
    tallyRef: l.stage !== 'Confirmed Lead' ? `TALLY-2026-${2000 + i}` : null,
    dueDate: '2026-08-31',
    daysOverdue: l.stage === 'Confirmed Lead' ? 3 : 0,
  }));
