import { NextApiRequest, NextApiResponse } from 'next'
import { sign } from "jsonwebtoken";
import { serialize } from "cookie";
import pool from '@/libs/db';
import { OkPacket, RowDataPacket } from 'mysql2';
import cookie from "cookie";
import bcrypt from 'bcrypt';

interface UserRow extends RowDataPacket {
  id: number;
  username: string;
  password: string;
  ROL: string;
}

export default async function loginHandler(req: NextApiRequest, res: NextApiResponse) {
  const { username, password } = req.body;

  if (req.method === 'OPTIONS') {
    // Responder a las solicitudes OPTIONS
    res.status(200).end();
    return;
  }

  try {
    const [rows] = await pool.query<UserRow[]>(
      "SELECT u.*, pi.*, r.* FROM T_MSUSUARIO u JOIN T_MCPERSONA_INTERNA pi ON u.PK_TMCPERSONA_INTERNA = pi.PK_TMCPERSONA_INTERNA JOIN T_MSROL_USUARIO ur ON u.XEUSU_CODIGO = ur.XEUSU_CODIGO JOIN T_MSROL r ON ur.PK_TMSROL = r.PK_TMSROL WHERE u.USU_NOMBRE = ?",
      [username]
    );

    if (rows.length === 1) {
      // Comparar la contraseña ingresada con la contraseña hasheada usando bcrypt
      const isPasswordValid = await bcrypt.compare(password, rows[0].XEUSU_PASWD);
      
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      console.log(rows);
      // expire in 30 days
      const token = sign(
        {
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
          PI: rows[0].PK_TMCPERSONA_INTERNA,
          CodUsuario: rows[0].XEUSU_CODIGO,
          NombreUsuario: rows[0].USU_NOMBRE,
          Nombre: rows[0].PEI_NOMBRE,
          ApellPaterno: rows[0].PEI_APELLIDO_PATERNO,
          CodRol: rows[0].PK_TMSROL,
          Rol: rows[0].ROL,
        },
        "secret"
      );

      /* const serialized = serialize("miEspacioSession", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 1209600000,
        path: "/",
      }); */

      //res.setHeader("Set-Cookie", serialized);
      const cookies = cookie.serialize("miEspacioSession", token, {
        maxAge: 1209600000,
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "none",
      });
      res.setHeader("Set-Cookie", cookies);
      console.log(`res.getHeader("Set-Cookie")`, res.getHeader("Set-Cookie"));

      return res.status(200).json({
        message: "Login successful",
      });
    }

    return res.status(401).json({ error: "Invalid credentials" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
}