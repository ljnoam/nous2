export type Bucket = {
  id: string
  created_at: string
  title: string
  description: string | null
  couple_id: string
  created_by: string
  icon: string | null
  color: string | null
}

export type BucketItem = {
  id: string
  created_at: string
  bucket_id: string
  content: string
  is_completed: boolean
  created_by: string
}

export type Expense = {
  id: string
  created_at: string
  amount: number
  description: string
  type: 'shared' | 'reimbursement'
  paid_by: string
  couple_id: string
  is_settled: boolean
}
