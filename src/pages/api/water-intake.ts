import type { NextApiRequest, NextApiResponse } from 'next'

type Data = {
  intake: number
}

let waterIntake = 0

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method === 'GET') {
    res.status(200).json({ intake: waterIntake })
  } else if (req.method === 'POST') {
    const { amount } = req.body
    waterIntake += amount
    res.status(200).json({ intake: waterIntake })
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}