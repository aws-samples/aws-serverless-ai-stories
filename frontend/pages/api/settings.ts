import { NextApiRequest, NextApiResponse } from "next";

const handler = (req: NextApiRequest, res: NextApiResponse) => {
    res.status(200).json({
        TABLE_NAME: process.env.TABLE_NAME,
        REGION: process.env.REGION,
    });
};

export default handler;