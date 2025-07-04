import { serialize } from "cookie";
import { NextApiRequest, NextApiResponse } from 'next';
import cookie from "cookie";

export default function logoutHandler(req: NextApiRequest, res: NextApiResponse) {
  const { miEspacioSession } = req.cookies;
  if (!miEspacioSession) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const cookies = cookie.serialize("miEspacioSession", '', {
    maxAge: 0,
    path: "/",
  });

  res.setHeader("Set-Cookie", cookies);
  return res.status(200).json({
    message: "Logout successful",
  });
}