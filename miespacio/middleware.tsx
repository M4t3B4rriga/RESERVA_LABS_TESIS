import { NextResponse } from "next/server";
import { NextApiRequest } from 'next';
import { jwtVerify } from "jose";
import { API_BASE_URL, API_BASE_URL_SEC } from '@/src/components/BaseURL';

export async function middleware(request: any) {
  const jwt = request.cookies.get("miEspacioSession");

  if (!jwt) {
    // Si no hay token JWT, redirigir al usuario a la página de inicio de sesión
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    // Decodificar y verificar el token JWT con el secreto adecuado
    const secret = "secret"; // Reemplazar con tu secreto real
    const { payload } = await jwtVerify(
      jwt.value.toString(),
      new TextEncoder().encode(secret)
    );

    // Verificar si el usuario tiene permisos para acceder a la ruta actual
    const { pathname } = new URL(request.url, API_BASE_URL_SEC);
    const codRol = payload.CodRol;
    let isAuthorized;
    if (typeof codRol === 'number' && Number.isInteger(codRol)) {
      isAuthorized = await verificarPermisos(codRol, pathname);
      // Resto del código
    } else {
      // Manejar el caso cuando payload.CodRol no es un número válido
      console.error('payload.CodRol no es un número válido');
    }


    if (!isAuthorized && pathname != "/") {
      // Si el usuario no tiene permisos, redirigirlo a la página de inicio o mostrar un error de acceso denegado.

      return NextResponse.redirect(new URL("/", request.url));
    }
    if (!isAuthorized && pathname == "/") {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.log(error);
    // Si hay algún error en la verificación del token, redirigir al usuario a la página de inicio de sesión.
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

// Función para verificar los permisos del usuario llamando a una API
async function verificarPermisos(codRol: number, ruta: string): Promise<boolean> {
  try {
    console.log(codRol);
    // Llamar a tu API para obtener los permisos del usuario y la ruta
    const response = await fetch(`${API_BASE_URL_SEC}/api/verificarPermisos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        roleId: codRol,
        ruta: ruta
      })
    });
    const permisos = await response.json();
    console.log(permisos.confirmarPermiso);
    return permisos.confirmarPermiso; 
  } catch (error) {
    console.log(error);
    return false;
  }
}

export const config = {
  matcher: [
    '/((?!login|forgot-password|about|api|_next|favicon.ico|espacios_images|images|%3Cno%20source%3E\\/).*)',
  ],
};
