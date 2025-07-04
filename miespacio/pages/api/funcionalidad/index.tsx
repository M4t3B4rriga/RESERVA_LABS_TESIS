import { NextApiRequest, NextApiResponse } from 'next'
import pool from '@/libs/db';
import url from 'url';
import querystring from 'querystring'
import { OkPacket } from 'mysql2';
import { Unidad } from '@/libs/unidad';
import { Funcionalidad } from '@/libs/funcionalidad';

// Interfaz para las query params de la petición GET
interface QueryParams {
  [key: string]: string | string[];
}

// Interfaz para los parámetros de la función getRoles
interface GetUnidadesParams {
  filter?: string;
  search?: string;
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: 'ASC' | 'DESC';
}

async function getFuncionalidades(req: NextApiRequest, res: NextApiResponse, { filter, search, page, limit, orderBy, orderDir }: GetUnidadesParams = {}) {
  const { ItemType, RolId, CodItem } = req.query;
  console.log(ItemType);
  if (ItemType && RolId && CodItem) {

    if (ItemType === 'Item') {

      const query = `SELECT PK_TMSFUNCIONALIDAD FROM t_mspermiso where PK_TMSROL=? AND PK_TMS_ITEM_MENU=?`;


      const [result] = await pool.query(query, [RolId, CodItem]);
      console.log(result);

      const formattedResult = result as { PK_TMSFUNCIONALIDAD: number }[];
      console.log(formattedResult);
      var funcionalidades:any;
      if (formattedResult.length != 0) {
        const queryA = `SELECT * FROM miespacio.t_msfuncionalidad WHERE PK_TMSFUNCIONALIDAD IN (${formattedResult.map(item => item.PK_TMSFUNCIONALIDAD).join(',')});`;

        const [resultado] = await pool.query(queryA);
        console.log(resultado);
        funcionalidades = resultado as Funcionalidad[];
      }else{
        funcionalidades = [];
      }
      res.status(200).json({ funcionalidades });
    }
    if (ItemType === 'subitem') {

      const query = `SELECT PK_TMSFUNCIONALIDAD FROM t_mspermiso where PK_TMSROL=? AND PK_TMSSUBITEM_MENU=?`;


      const [result] = await pool.query(query, [RolId, CodItem]);
      console.log(result);

      const formattedResult = result as { PK_TMSFUNCIONALIDAD: number }[];
      console.log(formattedResult);
      var funcionalidades:any;
      if (formattedResult.length != 0) {
        const queryA = `SELECT * FROM miespacio.t_msfuncionalidad WHERE PK_TMSFUNCIONALIDAD IN (${formattedResult.map(item => item.PK_TMSFUNCIONALIDAD).join(',')});`;

        const [resultado] = await pool.query(queryA);
        console.log(resultado);
        funcionalidades = resultado as Funcionalidad[];
      }else{
        funcionalidades = [];
      }
      res.status(200).json({ funcionalidades });
    }
    if (ItemType === 'subsubitem') {

      const query = `SELECT PK_TMSFUNCIONALIDAD FROM t_mspermiso where PK_TMSROL=? AND PK_TMSSUB_SUBITEM_MENU=?`;


      const [result] = await pool.query(query, [RolId, CodItem]);
      console.log(result);

      const formattedResult = result as { PK_TMSFUNCIONALIDAD: number }[];
      console.log(formattedResult);
      var funcionalidades:any;
      if (formattedResult.length != 0) {
        const queryA = `SELECT * FROM miespacio.t_msfuncionalidad WHERE PK_TMSFUNCIONALIDAD IN (${formattedResult.map(item => item.PK_TMSFUNCIONALIDAD).join(',')});`;

        const [resultado] = await pool.query(queryA);
        console.log(resultado);
        funcionalidades = resultado as Funcionalidad[];
      }else{
        funcionalidades = [];
      }
      res.status(200).json({ funcionalidades });
    }
  } else {
    try {
      // Asignamos valores por defecto si no se proporcionan en los parámetros.
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
        const allowedAttributes = ['ESTADO'];

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
          SELECT *
          FROM t_msfuncionalidad
          ${whereClause}
          ${orderClause}
          LIMIT ${limit}
          OFFSET ${offset}
      `;

      const countQuery = `SELECT COUNT(*) as count FROM t_msfuncionalidad ${whereClause}`;

      // Ejecutamos la consulta en la base de datos y devolvemos los resultados.

      const [result] = await pool.query(query);
      const funcionalidades = result as Funcionalidad[];

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

}

async function createFuncionalidad(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { NombreUnidad, Siglas, DescripcionUnidad } = req.body;
    const Estado = '1';
    const [result] = await pool.query<OkPacket>(
      'INSERT INTO T_MEUNIDAD (UNI_NOMBRE, UNI_SIGLAS, UNI_DESCRIPCION, ESTADO) VALUES (?, ?, ?, ?)',
      [NombreUnidad, Siglas, DescripcionUnidad, Estado]
    );
    const nuevaUnidad: Unidad = {
      CodUnidad: result.insertId,
      NombreUnidad,
      Siglas,
      DescripcionUnidad,
      Estado: '1',
    };
    res.status(201).json(nuevaUnidad);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al crear LA UNIDAD' });
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Unidad[] | Unidad | { message: string }>
) {
  const { method } = req;

  switch (method) {
    case 'GET':
      // Se parsean las query params de la URL para obtener los parámetros de la paginación y búsqueda
      const parsedUrl = url.parse(req.url || '', true);
      const { filter, search, page = '1', limit = '10', orderBy, orderDir } = parsedUrl.query;

      // Se llama a la función getRoles con los parámetros correspondientes
      await getFuncionalidades(req, res, {
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