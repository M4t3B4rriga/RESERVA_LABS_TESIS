import { NextApiRequest, NextApiResponse } from 'next'
import pool from '@/libs/db';
import url from 'url';
import querystring from 'querystring'
import { OkPacket } from 'mysql2';
import { FuncionalidadCrud } from '@/libs/funcionalidad';
import { jwtVerify } from "jose";
import { insertAuditLog } from '@/src/components/Auditoria';
import { VerificarPermisoApi } from '@/src/components/VerificacionPermisosApi';
import { Radio_Canada } from 'next/font/google';

// Interfaz para las query params de la petición GET
interface QueryParams {
  [key: string]: string | string[];
}

// Interfaz para los parámetros de la función getFuncionalidad
interface GetFuncionalidadParams {
  filter?: string;
  search?: string;
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: 'ASC' | 'DESC';
  cliente?: string;
}

async function getFuncionalidad(req: NextApiRequest, res: NextApiResponse, { filter, search, page, limit, orderBy, orderDir, cliente }: GetFuncionalidadParams = {}) {
  try {
    console.log("a servidor lo llamo" + page);
    //proteccion
    // Obtener la cookie del cliente
    const miEspacioSessionCookie = req.headers.cookie?.split(';').find(cookie => cookie.trim().startsWith('miEspacioSession='));

    // Extraer el valor de la cookie
    const miEspacioSessionValue = miEspacioSessionCookie?.split('=')[1];
    console.log("obtengo" + miEspacioSessionValue);

    page = page || 1;
    limit = limit || 10;
    const offset = (page - 1) * limit;
    const allowedOrderBy = ['PK_TMSFUNCIONALIDAD', 'FUN_NOMBRE', 'FUN_DESCRIPCION', 'ESTADO'];
    orderBy = allowedOrderBy.includes(orderBy || "") ? orderBy : 'PK_TMSFUNCIONALIDAD';
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
      whereConditions.push(`FUN_NOMBRE LIKE '%${search}%'`)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const orderClause = orderBy ? `ORDER BY ${orderBy} ${orderDir || 'ASC'}` : '';
    const query = `
                  SELECT 
                  PK_TMSFUNCIONALIDAD as CodFuncionalidad,
                  FUN_NOMBRE as NombreFuncionalidad,
                  FUN_DESCRIPCION as DescripcionFuncionalidad,
                  ESTADO as Estado
                  FROM T_MSFUNCIONALIDAD
                  ${whereClause}
                  ${orderClause}
                  LIMIT ${limit}
                  OFFSET ${offset}
                `;
    const countQuery = `SELECT COUNT(*) as count FROM T_MSFUNCIONALIDAD ${whereClause}`;

    // Ejecutamos la consulta en la base de datos y devolvemos los resultados.
    const [result] = await pool.query(query);
    const funcionalidades = result as FuncionalidadCrud[];

    // Ejecutamos la consulta en la base de datos para obtener el número total de registros.
    type CountResult = { count: number }[];
    const [countResult] = await pool.query(countQuery);
    const count = countResult as CountResult;
    const totalCount = count[0].count;

    res.status(200).json({ funcionalidades, totalCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener las funcionalidades' });
  }
}

async function createFuncionalidad(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { NombreFuncionalidad, DescripcionFuncionalidad } = req.body;
    const Estado = '1';
    const [result] = await pool.query<OkPacket>(
      'INSERT INTO T_MSFUNCIONALIDAD (FUN_NOMBRE, FUN_DESCRIPCION, ESTADO) VALUES (?, ?, ?)',
      [NombreFuncionalidad, DescripcionFuncionalidad, Estado]
    );
    const nuevoFuncionalidad: FuncionalidadCrud = {
      CodFuncionalidad: result.insertId,
      NombreFuncionalidad,
      DescripcionFuncionalidad,
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
        'Crear funcionalidad',
        'Éxito',
        req.headers['user-agent']?.split(' ')[0] ?? "",
        req.headers['user-agent']?.split(') ')[0].split('; ')[1] ?? ""
      );
    }
    //fin auditoria
    res.status(201).json(nuevoFuncionalidad);
  } catch (error) {
    console.error(error);
    const { miEspacioSession } = req.cookies;
    if (miEspacioSession !== undefined) {
      await insertAuditLog(
        miEspacioSession,
        new Date().toISOString().slice(0, 10),
        new Date().toLocaleTimeString(),
        req.socket?.remoteAddress ?? "",
        'Crear funcionalidad',
        'Fracaso',
        req.headers['user-agent']?.split(' ')[0] ?? "",
        req.headers['user-agent']?.split(') ')[0].split('; ')[1] ?? ""
      );
    }
    res.status(500).json({ message: 'Error al crear la funcionalidad' });
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FuncionalidadCrud[] | FuncionalidadCrud | { message: string }>
) {
  const { method } = req;

  switch (method) {
    case 'GET':
      // Se parsean las query params de la URL para obtener los parámetros de la paginación y búsqueda
      const parsedUrl = url.parse(req.url || '', true);
      const { filter, search, page = '1', limit = '10', orderBy, orderDir } = parsedUrl.query;

      // Se llama a la función getFuncionalidad con los parámetros correspondientes
      await getFuncionalidad(req, res, {
        filter: filter ? filter.toString() : undefined,
        search: search ? search.toString() : undefined,
        page: parseInt(page.toString(), 10),
        limit: parseInt(limit.toString(), 10,),
        orderBy: orderBy ? orderBy.toString() : undefined,
        orderDir: orderDir === 'DESC' ? 'DESC' : 'ASC',
      });
      break;

    case 'POST':
      await createFuncionalidad(req, res);
      break;
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).json({ message: `Método ${method} no permitido` });
      break;
  }
}