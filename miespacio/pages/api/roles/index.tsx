import { NextApiRequest, NextApiResponse } from 'next'
import pool from '@/libs/db';
import url from 'url';
import querystring from 'querystring'
import { OkPacket } from 'mysql2';
import { Roles } from '@/libs/roles';
import { jwtVerify } from "jose";
import { insertAuditLog } from '@/src/components/Auditoria';
import { VerificarPermisoApi } from '@/src/components/VerificacionPermisosApi';
// Interfaz para las query params de la petición GET
interface QueryParams {
  [key: string]: string | string[];
}

// Interfaz para los parámetros de la función getRoles
interface GetRolesParams {
  filter?: string;
  search?: string;
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: 'ASC' | 'DESC';
  cliente?: string;
}

async function getRoles(req: NextApiRequest, res: NextApiResponse, { filter, search, page, limit, orderBy, orderDir, cliente }: GetRolesParams = {}) {
  try {
    console.log("a servidor lo llamo"+page);
    //proteccion
    // Obtener la cookie del cliente
    const miEspacioSessionCookie = req.headers.cookie?.split(';').find(cookie => cookie.trim().startsWith('miEspacioSession='));

    // Extraer el valor de la cookie
    const miEspacioSessionValue = miEspacioSessionCookie?.split('=')[1];
    console.log("obtengo" + miEspacioSessionValue);
    let confirmarPermisos;
    // verificar acceso
    /*if(page){
      console.log("servidor llamado");
      if(miEspacioSessionValue){
        confirmarPermisos = await VerificarPermisoApi(
          miEspacioSessionValue,
          '/roles'
        );
        console.log("respuesta obtenida en la api" + confirmarPermisos);  
        if(!confirmarPermisos){
          res.status(500).json({ message: 'Usted no cuenta con los permisos para acceder a esta api' });
        } 
      }
      
    }*/
    
    
    //finProteccion 

    // Asignamos valores por defecto si no se proporcionan en los parámetros.
    page = page || 1;
    limit = limit || 10;
    const offset = (page - 1) * limit;
    const allowedOrderBy = ['PK_TMSROL', 'ROL_NOMBRE', 'ROL_DESCRIPCION', 'ESTADO'];
    orderBy = allowedOrderBy.includes(orderBy || "") ? orderBy : 'PK_TMSROL';
    const allowedOrderDir = ['ASC', 'asc', 'DESC', 'desc'];
    orderDir = allowedOrderDir.includes(orderDir || "") ? orderDir : 'ASC';
    const whereConditions = [];
    const filterConditions = [] as string[];

    if (filter) {
      // Separar los filtros.
      const filterParams = filter ? filter.split(',') : [];
      const allowedAttributes = ['Estado'];

      // Construimos la cláusula WHERE en base a los filtros y la cadena de búsqueda.
      filterParams.forEach(param => {
        const [attribute, value] = param.split('-');
        if (!allowedAttributes.includes(attribute)) {
          console.error(`El atributo ${attribute} no está permitido`);
          return;
        }
        if (!value) {
          console.error(`Se debe proporcionar un valor para el atributo ${attribute}`);
          return;
        }

        filterConditions.push(`${attribute} = '${value}'`);
      });
    }
    if (filterConditions.length > 0) {
      whereConditions.push(`(${filterConditions.join(' OR ')})`);
    }

    if (search) {
      whereConditions.push(`ROL_NOMBRE LIKE '%${search}%'`)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const orderClause = orderBy ? `ORDER BY ${orderBy} ${orderDir || 'ASC'}` : '';
    const query = `
                  SELECT 
                  PK_TMSROL as CodRol,
                  ROL_NOMBRE as NombreRol,
                  ROL_DESCRIPCION as DescripcionRol,
                  ESTADO as Estado
                  FROM T_MSROL
                  ${whereClause}
                  ${orderClause}
                  LIMIT ${limit}
                  OFFSET ${offset}
                `;
    const countQuery = `SELECT COUNT(*) as count FROM T_MSROL ${whereClause}`;

    // Ejecutamos la consulta en la base de datos y devolvemos los resultados.
    const [result] = await pool.query(query);
    const roles = result as Roles[];

    // Ejecutamos la consulta en la base de datos para obtener el número total de registros.
    type CountResult = { count: number }[];
    const [countResult] = await pool.query(countQuery);
    const count = countResult as CountResult;
    const totalCount = count[0].count;

    res.status(200).json({ roles, totalCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener los roles' });
  }
}

async function createRol(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { NombreRol, DescripcionRol } = req.body;
    const Estado = '1';
    const [result] = await pool.query<OkPacket>(
      'INSERT INTO T_MSROL (ROL_NOMBRE, ROL_DESCRIPCION, ESTADO) VALUES (?, ?, ?)',
      [NombreRol, DescripcionRol, Estado]
    );
    const nuevoRol: Roles = {
      CodRol: result.insertId,
      NombreRol,
      DescripcionRol,
      Estado: '1',
    };
    //auditoria
    const { miEspacioSession } = req.cookies;
    console.log("aca" + miEspacioSession);
    if (miEspacioSession !== undefined) {
      await insertAuditLog(
        miEspacioSession,
        new Date().toISOString().slice(0, 10),
        new Date().toLocaleTimeString(),
        req.socket?.remoteAddress ?? "",
        'Crear rol',
        'Éxito',
        req.headers['user-agent']?.split(' ')[0] ?? "",
        req.headers['user-agent']?.split(') ')[0].split('; ')[1] ?? ""
      );
    }
    //fin auditoria
    res.status(201).json(nuevoRol);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al crear el rol' });
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Roles[] | Roles | { message: string }>
) {
  const { method } = req;

  switch (method) {
    case 'GET':
      // Se parsean las query params de la URL para obtener los parámetros de la paginación y búsqueda
      const parsedUrl = url.parse(req.url || '', true);
      const { filter, search, page = '1', limit = '10', orderBy, orderDir } = parsedUrl.query;

      // Se llama a la función getRoles con los parámetros correspondientes
      await getRoles(req, res, {
        filter: filter ? filter.toString() : undefined,
        search: search ? search.toString() : undefined,
        page: parseInt(page.toString(), 10),
        limit: parseInt(limit.toString(), 10,),
        orderBy: orderBy ? orderBy.toString() : undefined,
        orderDir: orderDir === 'DESC' ? 'DESC' : 'ASC',
      });
      break;

    case 'POST':
      await createRol(req, res);
      break;
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).json({ message: `Método ${method} no permitido` });
      break;
  }
}