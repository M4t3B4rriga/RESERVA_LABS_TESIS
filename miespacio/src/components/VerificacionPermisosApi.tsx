import { NextApiRequest } from 'next';
import pool from '@/libs/db';
import { jwtVerify } from "jose";
import { API_BASE_URL } from './BaseURL';
export async function VerificarPermisoApi(
    coockie: string,
    ruta: string,
) {

    try {
        const Estado = '1';
        const { payload } = await jwtVerify(
            coockie,
            new TextEncoder().encode("secret")
        );
        const codRol = payload.CodRol;
        let isAuthorized;
        console.log("verique la api y voy a devolver algo");
        if (typeof codRol === 'number' && Number.isInteger(codRol)) {
            isAuthorized = await verificarPermisos(codRol, ruta);
            console.log("verique la api y voy a devolver"+isAuthorized);
            return isAuthorized;
            // Resto del código
        } else {
            // Manejar el caso cuando payload.CodRol no es un número válido
            console.error('payload.CodRol no es un número válido');
            return false;
        }
    } catch (error) {
        console.error(error);
        return false;
    }
    // Función para verificar los permisos del usuario llamando a una API
    async function verificarPermisos(codRol: number, ruta: string): Promise<boolean> {
        try {
            console.log("me llamaron" + codRol);
            // Llamar a tu API para obtener los permisos del usuario y la ruta
            const response = await fetch(`${API_BASE_URL}/api/verificarPermisos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    roleId: codRol,
                    ruta: ruta
                })
            });
            const permisos = await response.json(); // Supongamos que la API devuelve un objeto con los permisos
            console.log("hola" + permisos.confirmarPermiso);
            // Aquí debes implementar la lógica para verificar si el usuario tiene permisos para acceder a la ruta específica.
            // Puedes utilizar la información devuelta por la API (permisos) para hacer esta verificación.
            // Devuelve true si el usuario tiene permisos, o false si no los tiene.
            // Ejemplo:
            // return permisos.tienePermiso;
            return permisos.confirmarPermiso; // Cambiar esto con tu lógica real de verificación de permisos
        } catch (error) {
            console.log(error);
            return false;
        }
    }
}