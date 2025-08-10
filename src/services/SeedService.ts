import { Job, Client, Expense, ChecklistItem } from '../types';
import { setJobs } from './StorageService';
import { setClients as persistClients } from './ClientService';

const now = () => new Date().toISOString();

const makeClient = (i: number): Client => ({
  id: `client_${i}`,
  fullName: `Client ${i}`,
  address: `${i} Main St, City, ST`,
  phoneNumber: `555-000-${(1000 + i).toString().slice(-4)}`,
  emailAddress: `client${i}@example.com`,
  createdDate: now(),
});

const makeChecklistItems = (count: number): ChecklistItem[] =>
  Array.from({ length: count }).map((_, idx) => ({
    id: `tool_${idx}`,
    text: `Tool/Supply ${idx + 1}`,
    completed: idx % 2 === 0,
    createdDate: now(),
  }));

const makeExpense = (id: string, amount: number): Expense => ({
  id,
  description: `Expense ${id}`,
  amount,
  isReimbursable: false,
  date: now(),
});

const makeJob = (i: number, client: Client, status: Job['status']): Job => ({
  id: `job_${i}`,
  jobName: `Job ${i}`,
  description: `Job ${i} description for ${client.fullName}`,
  clientId: client.id,
  clientName: client.fullName,
  quote: 500 + i * 100,
  quoteDate: '2024-01-01',
  startDate: '2024-01-05',
  endDate: '2024-01-10',
  status,
  expenses: [makeExpense(`e_${i}_1`, 50 + i * 10)],
  toolsAndSupplies: makeChecklistItems(3),
  notes: `Notes for job ${i}`,
});

export const seedMinimal = async () => {
  const c1 = makeClient(1);
  const jobs = [makeJob(1, c1, 'Quoted')];
  await setJobs(jobs);
  await persistClients([c1]);
  return { clients: [c1], jobs };
};

export const seedFullWorkflow = async () => {
  const c1 = makeClient(1);

  const statuses: Job['status'][] = [
    'Quoted',
    'Accepted',
    'In-Progress',
    'Completed',
    'Cancelled',
  ];

  const formatDate = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const today = new Date();
  const jobs: Job[] = [];
  for (let i = 1; i <= 50; i++) {
    const status = statuses[(i - 1) % statuses.length];
    const start = new Date(today);
    start.setDate(start.getDate() - i); // newer first when sorted desc
    const end = new Date(start);
    end.setDate(start.getDate() + 3);
    const quote = new Date(start);
    quote.setDate(start.getDate() - 4);

    const j = makeJob(i, c1, status);
    j.startDate = formatDate(start);
    j.endDate = formatDate(end);
    j.quoteDate = formatDate(quote);

    // Add a couple of expenses on some jobs
    if (i % 3 === 0) {
      j.expenses.push(makeExpense(`e_${i}_2`, 75));
    }
    if (i % 5 === 0) {
      j.expenses.push({
        ...makeExpense(`e_${i}_3`, 120),
        isReimbursable: true,
      });
    }

    jobs.push(j);
  }

  await setJobs(jobs);
  await persistClients([c1]);
  return { clients: [c1], jobs };
};

export const seedEdgeCases = async () => {
  const c = makeClient(99);
  const overBudget = makeJob(99, c, 'In-Progress');
  overBudget.expenses.push(makeExpense('over_1', 9999));
  const canceled = makeJob(100, c, 'Cancelled');
  canceled.expenses = [];
  const jobs = [overBudget, canceled];
  await setJobs(jobs);
  await persistClients([c]);
  return { clients: [c], jobs };
};

export type SeedResult = Awaited<ReturnType<typeof seedMinimal>>;


