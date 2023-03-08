import { NextApiRequest, NextApiResponse } from "next";

const handler = (req: NextApiRequest, res: NextApiResponse) => {
    res.status(200).json({ ok: Date.now().toString() });
};

export default handler;