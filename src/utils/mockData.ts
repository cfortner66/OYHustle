// Mock data generators for development and testing - React Native optimized

export interface Transaction {
  id: number;
  date: Date;
  merchant: string;
  category: string;
  amount: number;
  description: string;
  paymentMethod: string;
}

export interface UserProfile {
  location: string;
  householdSize: number;
  income: number;
  creditScore: number;
  debtBalance: number;
  savingsGoal: number;
  riskTolerance: string;
  preferences: string[];
  activeHustles: string[];
  availableHours: number;
  transportationMode: string;
  skills: string[];
}

export interface HustleOpportunity {
  id: number;
  title: string;
  category: string;
  hourlyRate: number;
  location: string;
  timeCommitment: string;
  requirements: string[];
  description: string;
}

export const generateTransactions = (): Transaction[] => {
  const categories = [
    'Groceries',
    'Gas',
    'Restaurants',
    'Utilities',
    'Entertainment',
    'Shopping',
    'Insurance',
    'Subscriptions',
  ];
  const merchants: Record<string, string[]> = {
    Groceries: ['Walmart', 'Target', 'Whole Foods', 'Kroger', 'Aldi'],
    Gas: ['Shell', 'BP', 'Exxon', 'Chevron', 'Marathon'],
    Restaurants: [
      "McDonald's",
      'Starbucks',
      'Chipotle',
      'Local Diner',
      'Subway',
    ],
    Utilities: [
      'Electric Co',
      'Gas Co',
      'Water Dept',
      'Internet Provider',
      'Phone Bill',
    ],
    Entertainment: [
      'Netflix',
      'Spotify',
      'Movie Theater',
      'Concert Venue',
      'Gaming',
    ],
    Shopping: ['Amazon', 'Best Buy', "Macy's", 'Local Store', 'Target'],
    Insurance: [
      'State Farm',
      'Geico',
      'Progressive',
      'Allstate',
      'Liberty Mutual',
    ],
    Subscriptions: [
      'Netflix',
      'Spotify',
      'Adobe',
      'Gym Membership',
      'Amazon Prime',
    ],
  };

  const transactions: Transaction[] = [];
  for (let i = 0; i < 100; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    if (!category) continue;
    const merchantList = merchants[category];
    if (!merchantList) continue;

    const merchant =
      merchantList[Math.floor(Math.random() * merchantList.length)];
    if (!merchant) continue;

    const amount = Math.random() * 200 + 10;
    const date = new Date(
      Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
    );
    const paymentMethods = ['Credit Card', 'Debit Card', 'Cash', 'Mobile Pay'];
    const paymentMethod =
      paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    if (!paymentMethod) continue;

    transactions.push({
      id: i,
      date,
      merchant,
      category,
      amount: parseFloat(amount.toFixed(2)),
      description: `${merchant} - ${category}`,
      paymentMethod,
    });
  }
  return transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
};

export const generateUserProfile = (): UserProfile => ({
  location: 'Marion, Illinois',
  householdSize: 3,
  income: 75000,
  creditScore: 720,
  debtBalance: 25000,
  savingsGoal: 10000,
  riskTolerance: 'moderate',
  preferences: ['cashback', 'gas_savings', 'grocery_discounts'],
  // OYHustle specific fields
  activeHustles: ['Food Delivery', 'Pet Sitting'],
  availableHours: 15, // hours per week for side hustles
  transportationMode: 'car',
  skills: ['driving', 'customer_service', 'time_management'],
});

// Generate sample side gig opportunities (OYHustle specific)
export const generateHustleOpportunities = (): HustleOpportunity[] => [
  {
    id: 1,
    title: 'Food Delivery Driver',
    category: 'Delivery',
    hourlyRate: 18,
    location: 'Marion, IL',
    timeCommitment: '10-20 hours/week',
    requirements: ['Valid license', 'Reliable Vehicle', 'Smartphone'],
    description:
      'Deliver food from local restaurants to customers. Flexible hours.',
  },
];
