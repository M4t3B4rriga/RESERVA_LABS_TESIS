import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/libs/db';
import { RowDataPacket } from 'mysql2';
import { MenuItem } from '@/libs/MenuItem';
import { SubMenuItem } from '@/libs/SubMenuItem';
import { SubSubMenuItem } from '@/libs/SubSubMenuItem';
import { OkPacket } from 'mysql2';

interface PermisoRequestBody {
  roleId: string;
  selectedItems: number[];
  selectedSubItems: number[];
  selectedSubSubItems: number[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<{ menuItems: MenuItem[], subMenuItems: SubMenuItem[], subSubMenuItems: SubSubMenuItem[] } | { message: string }>) {
  const { method } = req;

  switch (method) {
    case 'GET':
      try {
        const menuItemsQuery = `SELECT * FROM t_msitem_menu WHERE ESTADO = 1 ORDER BY IME_POSICION`;
        const subMenuItemsQuery = 'SELECT * FROM t_mssubitem_menu WHERE ESTADO = 1 ORDER BY SME_POSICION';
        const subSubMenuItemsQuery = 'SELECT * FROM t_mssub_subitem_menu WHERE ESTADO = 1 ORDER BY SSM_POSICION';

        const [menuItemsResult] = await pool.execute<RowDataPacket[]>(menuItemsQuery);
        const [subMenuItemsResult] = await pool.execute<RowDataPacket[]>(subMenuItemsQuery);
        const [subSubMenuItemsResult] = await pool.execute<RowDataPacket[]>(subSubMenuItemsQuery);

        const menuItems: MenuItem[] = menuItemsResult as MenuItem[];
        const subMenuItems: SubMenuItem[] = subMenuItemsResult as SubMenuItem[];
        const subSubMenuItems: SubSubMenuItem[] = subSubMenuItemsResult as SubSubMenuItem[];

        const response = {
          menuItems,
          subMenuItems,
          subSubMenuItems
        };

        res.status(200).json(response);
      } catch (error) {
        console.error('Error al obtener los datos del menú:', error);
        res.status(500).json({ message: 'Error al obtener los datos del menú' });
      }
      break;

    case 'POST':
      const { roleId, selectedItems, selectedSubItems, selectedSubSubItems }: PermisoRequestBody = req.body;

      try {
        // Obtener la fecha actual
        const fechaAsignacion = new Date();
        const estado = 1;

        // Realizar el borrado solo si hay elementos seleccionados
        if (selectedItems.length > 0 || selectedSubItems.length > 0 || selectedSubSubItems.length > 0) {
          const deleteConditions = [];
          let deleteParams: any[] = [];

          //
          if (selectedItems.length > 0) {
            deleteConditions.push(`PK_TMS_ITEM_MENU NOT IN (?)`);
            deleteParams = [[roleId], selectedItems];
          }
          else {

            deleteConditions.push(`PK_TMS_ITEM_MENU NOT IN (-999)`);

          }
          //
          //
          if (selectedSubItems.length > 0) {
            deleteConditions.push(`PK_TMSSUBITEM_MENU NOT IN (?)`);
            deleteParams = [[roleId], selectedItems, selectedSubItems];
          }
          else {
            deleteConditions.push(`PK_TMSSUBITEM_MENU NOT IN (-999)`);
          }
          //

          //
          if (selectedSubSubItems.length > 0) {
            deleteConditions.push(`PK_TMSSUB_SUBITEM_MENU NOT IN (?)`);
            deleteParams = [[roleId], selectedItems, selectedSubItems, selectedSubSubItems];
          }
          else {
            deleteConditions.push(`PK_TMSSUB_SUBITEM_MENU NOT IN (-999)`);
          }
          //

          const deleteQuery = `DELETE FROM T_MSPERMISO WHERE PK_TMSROL = ? AND (${deleteConditions.join(' OR ')})`;

          await pool.query(deleteQuery, deleteParams);
        }
        else {
          const deleteQuery = `DELETE FROM T_MSPERMISO WHERE PK_TMSROL = ?`;
          await pool.query(deleteQuery, roleId);
        }

        // Realizar las operaciones de inserción solo si hay elementos seleccionados
        if (selectedItems.length > 0 || selectedSubItems.length > 0 || selectedSubSubItems.length > 0) {
          const insertQuery = `INSERT INTO T_MSPERMISO (PK_TMSROL, PK_TMS_ITEM_MENU, PK_TMSSUBITEM_MENU, PK_TMSSUB_SUBITEM_MENU, PER_FECHA_ASIGNACION, ESTADO) 
              SELECT ?, ?, ?, ?, ?, ?
              FROM DUAL
              WHERE NOT EXISTS (
                SELECT 1 FROM T_MSPERMISO 
                WHERE PK_TMSROL = ? AND
                (PK_TMS_ITEM_MENU = ? OR PK_TMSSUBITEM_MENU = ? OR PK_TMSSUB_SUBITEM_MENU = ?)
              )`;

          const values = selectedItems
            .map(itemId => [roleId, itemId, null, null, fechaAsignacion, estado, roleId, itemId, null, null])
            .concat(selectedSubItems
              .map(subItemId => [roleId, null, subItemId, null, fechaAsignacion, estado, roleId, null, subItemId, null])
            )
            .concat(selectedSubSubItems
              .map(subSubItemId => [roleId, null, null, subSubItemId, fechaAsignacion, estado, roleId, null, null, subSubItemId])
            );

          await Promise.all(
            values.map(params => pool.query(insertQuery, params))
          );
        }

        console.log('Permisos guardados exitosamente');
        return res.status(200).json({ message: 'Permisos guardados exitosamente' });
      } catch (error) {
        console.error('Error al guardar los permisos:', error);
        return res.status(500).json({ message: 'Error al guardar los permisos' });
      }
      break;





    case 'PUT':

      console.log("api");
      try {
        const { RolId, itemType, CodigoItem, CodigoSubItem, CodigoSubSubItem, CodFuncionalidades } = req.body;

        if (itemType === 'item') {
          try {
            const fechaAsignacion = new Date();
            const estado = 1;
            console.log(CodFuncionalidades);
            if (CodigoItem.length != 0) {
              //limpio
              const queryClean = `DELETE FROM t_mspermiso where PK_TMSROL=? AND PK_TMS_ITEM_MENU=?`;
              await pool.query(queryClean, [RolId, CodigoItem]);
              // Realizar las operaciones de inserción en la base de datos
              const permisosValues = CodFuncionalidades.map((CodFuncionalidad: number) => [RolId, CodigoItem, null, null, fechaAsignacion, 1, CodFuncionalidad]);

              await pool.query<OkPacket>(
                'INSERT INTO t_mspermiso (PK_TMSROL, PK_TMS_ITEM_MENU, PK_TMSSUBITEM_MENU, PK_TMSSUB_SUBITEM_MENU, PER_FECHA_ASIGNACION, ESTADO, PK_TMSFUNCIONALIDAD) VALUES ?',
                [permisosValues]
              );
            }
            else {
              //limpio
              const queryClean = `DELETE FROM t_mspermiso where PK_TMSROL=? AND PK_TMS_ITEM_MENU=?`;
              await pool.query(queryClean, [RolId, CodigoItem]);
              //dejo en null
              const [result] = await pool.query<OkPacket>(
                `INSERT INTO t_mspermiso (PK_TMSROL, PK_TMS_ITEM_MENU, PK_TMSSUBITEM_MENU, PK_TMSSUB_SUBITEM_MENU, PER_FECHA_ASIGNACION, ESTADO, PK_TMSFUNCIONALIDAD) VALUES ( '1', '1', null, null, '2023-06-28 20:42:39', '1', '1')`,
                [RolId, CodigoItem, null, null, fechaAsignacion, estado, null]
              );

            }
          } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al crear el item' });
          }


        } else if (itemType === 'subitem') {

          try {
            const fechaAsignacion = new Date();
            const estado = 1;
            console.log(CodFuncionalidades);
            if (CodigoSubItem.length != 0) {
              //limpio
              const queryClean = `DELETE FROM t_mspermiso where PK_TMSROL=? AND PK_TMSSUBITEM_MENU=?`;
              await pool.query(queryClean, [RolId, CodigoSubItem]);
              // Realizar las operaciones de inserción en la base de datos
              const permisosValues = CodFuncionalidades.map((CodFuncionalidad: number) => [RolId, null, CodigoSubItem, null, fechaAsignacion, 1, CodFuncionalidad]);

              await pool.query<OkPacket>(
                'INSERT INTO t_mspermiso (PK_TMSROL, PK_TMS_ITEM_MENU, PK_TMSSUBITEM_MENU, PK_TMSSUB_SUBITEM_MENU, PER_FECHA_ASIGNACION, ESTADO, PK_TMSFUNCIONALIDAD) VALUES ?',
                [permisosValues]
              );
            }
            else {
              //limpio
              const queryClean = `DELETE FROM t_mspermiso where PK_TMSROL=? AND PK_TMS_ITEM_MENU=?`;
              await pool.query(queryClean, [RolId, CodigoItem]);
              //dejo en null
              const [result] = await pool.query<OkPacket>(
                `INSERT INTO t_mspermiso (PK_TMSROL, PK_TMS_ITEM_MENU, PK_TMSSUBITEM_MENU, PK_TMSSUB_SUBITEM_MENU, PER_FECHA_ASIGNACION, ESTADO, PK_TMSFUNCIONALIDAD) VALUES ( '1', '1', null, null, '2023-06-28 20:42:39', '1', '1')`,
                [RolId, CodigoItem, null, null, fechaAsignacion, estado, null]
              );

            }

          } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al crear el Sub item' });
          }


        } else if (itemType === 'subsubitem') {

          try {
            const fechaAsignacion = new Date();
            const estado = 1;
            console.log(CodFuncionalidades);
            if (CodigoSubSubItem.length != 0) {
              //limpio
              const queryClean = `DELETE FROM t_mspermiso where PK_TMSROL=? AND PK_TMSSUB_SUBITEM_MENU=?`;
              await pool.query(queryClean, [RolId, CodigoSubSubItem]);
              // Realizar las operaciones de inserción en la base de datos
              const permisosValues = CodFuncionalidades.map((CodFuncionalidad: number) => [RolId, null, null, CodigoSubSubItem, fechaAsignacion, 1, CodFuncionalidad]);

              await pool.query<OkPacket>(
                'INSERT INTO t_mspermiso (PK_TMSROL, PK_TMS_ITEM_MENU, PK_TMSSUBITEM_MENU, PK_TMSSUB_SUBITEM_MENU, PER_FECHA_ASIGNACION, ESTADO, PK_TMSFUNCIONALIDAD) VALUES ?',
                [permisosValues]
              );
            }
            else {
              //limpio
              const queryClean = `DELETE FROM t_mspermiso where PK_TMSROL=? AND PK_TMS_ITEM_MENU=?`;
              await pool.query(queryClean, [RolId, CodigoItem]);
              //dejo en null
              const [result] = await pool.query<OkPacket>(
                `INSERT INTO t_mspermiso (PK_TMSROL, PK_TMS_ITEM_MENU, PK_TMSSUBITEM_MENU, PK_TMSSUB_SUBITEM_MENU, PER_FECHA_ASIGNACION, ESTADO, PK_TMSFUNCIONALIDAD) VALUES ( '1', '1', null, null, '2023-06-28 20:42:39', '1', '1')`,
                [RolId, CodigoItem, null, null, fechaAsignacion, estado, null]
              );

            }


          } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al crear el Sub item' });
          }

        } else {
          res.status(400).json({ message: 'Tipo de elemento no válido' });
        }
      } catch (error) {
        console.error('Error al crear un nuevo elemento:', error);
        res.status(500).json({ message: 'Error al crear un nuevo elemento' });
      }
      break;
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT']);
      res.status(405).json({ message: `Método ${method} no permitido` });
      break;
  }
}
