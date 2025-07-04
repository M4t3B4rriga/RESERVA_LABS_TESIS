import { NextResponse } from "next/server";
import { NextApiRequest } from 'next';
import { jwtVerify } from "jose";

export async function middleware(request: NextApiRequest) {
  const { cookies } = request;
  const jwt = cookies?.["miEspacioSession"];
  
  if (!jwt) return NextResponse.redirect(new URL("/login", request.url));
  
  try {
    const { payload } = await jwtVerify(
      jwt.toString(),
      new TextEncoder().encode("secret")
    );
    console.log("aca esta el payload" + payload.CodRol);
    
    if (payload.CodRol === 1) {
      return NextResponse.next();
    } else if (payload.CodRol === 2) {
      const { path } = request.query;
      if (path === "equipo" || path === "unidad") {
        return NextResponse.next();
      } else {
        return NextResponse.redirect(new URL("/login", request.url));
      }
    } else {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  } catch (error) {
    console.log(error);
    return NextResponse.redirect(new URL("/login", request.url));
  }
}