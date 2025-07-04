import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/libs/db';
import { RowDataPacket } from 'mysql2';
import { MenuItem } from '@/libs/MenuItem';
import { SubMenuItem } from '@/libs/SubMenuItem';
import { SubSubMenuItem } from '@/libs/SubSubMenuItem';
import { OkPacket } from 'mysql2';


export default async function handler(req: NextApiRequest, res: NextApiResponse<{ message: string } | { confirmarPermiso: boolean }>) {
    const { method } = req;

    switch (method) {
        case 'GET':

            break;

            case 'POST':
                const { roleId, ruta } = req.body;
                let confirmarPermiso = false;
                try {
                  console.log(roleId + ruta);
              
                  let cleanedPath = ruta.replace(/\/\d+$/, ''); // Eliminar la parte que termina en un número
                  console.log(cleanedPath);
              
                  const slashesCount = cleanedPath.split('/').length - 1;
                  console.log(slashesCount);
              
                  if (slashesCount == 1) {
                    // es un item
                    console.log("es un item");
                    const [rows] = await pool.query<RowDataPacket[]>(
                      'SELECT PK_TMS_ITEM_MENU FROM t_msitem_menu WHERE IME_URL=? AND ESTADO = 1',
                      [cleanedPath]
                    );
                    console.log(rows);
                    if (rows.length > 0) {
                      const ItemCodigo = rows[0].PK_TMS_ITEM_MENU;
                      console.log("el codigo del item es" + ItemCodigo);
                      const [rol] = await pool.query<RowDataPacket[]>(
                        'SELECT PK_TMSROL FROM t_mspermiso WHERE PK_TMS_ITEM_MENU=? AND ESTADO = 1',
                        [ItemCodigo]
                      );
              
                      if (rol.length > 0) {
                        console.log("cantidad de roles" + rol.length);
                        console.log(rol);
                        let rolId: any;
                        for (let i = 0; i < rol.length; i++) {
                          rolId = rol[i].PK_TMSROL;
                          console.log("rol base de datos" + rolId + "rol parametro" + roleId);
                          if (rolId == roleId) {
                            confirmarPermiso = true;
                          }
                        }
              
                      } else {
                        console.log('No se encontró ningún resultado.');
                      }
                    } else {
                      console.log('No se encontró ningún resultado.');
                    }
                    console.log(confirmarPermiso);
                    return res.status(200).json({ confirmarPermiso });
                  }
                  else if (slashesCount == 2) {
                    console.log("es un subitem");
                    const partes = cleanedPath.split("/"); // Divide la cadena en partes separadas por "/"
                    const rutaFinal = `/${partes.pop()}`; // Obtiene y concatena la última parte de la ruta con "/"
                    console.log(rutaFinal); // "/ruta2"
                    // es un subitem
                    const [rows] = await pool.query<RowDataPacket[]>(
                      'SELECT PK_TMSSUBITEM_MENU FROM t_mssubitem_menu WHERE SME_URL=? AND ESTADO = 1',
                      [rutaFinal]
                    );
              
                    if (rows.length > 0) {
                      const SubItemCodigo = rows[0].PK_TMSSUBITEM_MENU;
                      console.log(SubItemCodigo);
                      const [rol] = await pool.query<RowDataPacket[]>(
                        'SELECT PK_TMSROL FROM t_mspermiso WHERE PK_TMSSUBITEM_MENU=? AND ESTADO = 1',
                        [SubItemCodigo]
                      );
              
                      if (rol.length > 0) {
                        console.log(rol.length);
                        console.log(rol);
                        let rolId: any;
                        for (let i = 0; i < rol.length; i++) {
                          rolId = rol[i].PK_TMSROL;
                          if (rolId == roleId) {
                            confirmarPermiso = true;
                          }
                        }
              
                      } else {
                        console.log('No se encontró ningún resultado.');
                      }
                    } else {
                      console.log('No se encontró ningún resultado.');
                    }
                    console.log(confirmarPermiso);
                    return res.status(200).json({ confirmarPermiso });
                  }
                  else if (slashesCount == 3) {
                    // es un subsubitem
                    console.log("es un subsubitem");
                    const [rows] = await pool.query<RowDataPacket[]>(
                      'SELECT PK_TMSSUB_SUBITEM_MENU FROM t_mssub_subitem_menu WHERE SSM_URL=? AND ESTADO = 1',
                      [cleanedPath]
                    );
              
                    if (rows.length > 0) {
                      const SubSubItemCodigo = rows[0].PK_TMSSUB_SUBITEM_MENU;
                      console.log(SubSubItemCodigo);
                      const [rol] = await pool.query<RowDataPacket[]>(
                        'SELECT PK_TMSROL FROM t_mspermiso WHERE PK_TMSSUB_SUBITEM_MENU=? AND ESTADO = 1',
                        [SubSubItemCodigo]
                      );
              
                      if (rol.length > 0) {
                        console.log(rol.length);
                        console.log(rol);
                        let rolId: any;
                        for (let i = 0; i < rol.length; i++) {
                          rolId = rol[i].PK_TMSROL;
                          if (rolId == roleId) {
                            confirmarPermiso = true;
                          }
                        }
              
                      } else {
                        console.log('No se encontró ningún resultado.');
                      }
                    } else {
                      console.log('No se encontró ningún resultado.');
                    }
                    console.log(confirmarPermiso);
                    return res.status(200).json({ confirmarPermiso });
                  }
                  return res.status(200).json({ confirmarPermiso });
              
                } catch (error) {
                  console.error('Error al guardar los permisos:', error);
                  return res.status(500).json({ message: 'Error al guardar los permisos' });
                }
              
                break;
              
              


        case 'PUT':


            break;

        default:
            res.setHeader('Allow', ['GET', 'POST', 'PUT']);
            res.status(405).json({ message: `Método ${method} no permitido` });
            break;
    }
}
