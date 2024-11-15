import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../src/utils/dbConnect';
import User from '../../../src/models/User';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Received request to /api/user/register');
  await dbConnect();

  if (req.method === 'POST') {
    try {

      const existingUser = await User.findOne({ email: req.body.email });

      if (existingUser) {
        return res.status(400).json({ success: false, message: 'User with this email already exists' });
      }
      const user = new User(req.body);
      await user.save();
      return res.status(201).json({ success: true, data: user });
    } catch (error) {
      let errorMessage = 'An unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      return res.status(400).json({ success: false, error: errorMessage });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
