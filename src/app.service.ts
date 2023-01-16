import { Injectable } from '@nestjs/common';
import { join } from 'path';
import fetch from 'node-fetch';
import * as fs from 'fs';

const fileNameBase = 'listaGasolinerasProvValencia';
const extensionFile = '.gasol';

@Injectable()
export class AppService {
  async getGasolineras(CP: any, idComb: any) {
    const folder = join(__dirname, 'cacheGasolineras');

    if (!fs.existsSync(folder)) fs.mkdirSync(folder);

    // Directory of the data that will be created or will be directly readed
    const fileSearched = join(
      folder,
      fileNameBase + '_' + CP + '_' + idComb + extensionFile,
    );

    // If file doesnt exists creates one
    if (!fs.existsSync(fileSearched)) {
      try {
        await getListaGasolinerasByCPandIdComb(CP, idComb, fileSearched);
      } catch (error) {
        return 'Se ha seleccionado un Código Postal que no es correcto o no hay gasolineras que tengan este tipo de combustible en la zona del Código Postal.';
      }
    }

    let fileReaded = JSON.parse(
      fs.readFileSync(fileSearched, 'utf-8'),
    ) as GetGasolinerasFinal;

    // If the file is older than 30 minutes, it refreshes with the new data published
    if (
      new Date().getTime() - new Date(fileReaded.Fecha).getTime() >
      30 * 60 * 1000
    ) {
      await getListaGasolinerasByCPandIdComb(CP, idComb, fileSearched);
      fileReaded = JSON.parse(
        fs.readFileSync(fileSearched, 'utf-8'),
      ) as GetGasolinerasFinal;
    }

    return fileReaded.ListaGasolineras;
  }
}

type GetGasolinerasFinal = {
  Fecha: Date;
  ListaGasolineras: GasolineraFinal[];
};

type GasolineraFinal = {
  Nombre: string;
  Precio: number;
  Direccion: string;
  GoogleMaps: string;
};

type Gasolinera = {
  'C.P.': number;
  Dirección: string;
  Horario: string;
  Latitud: string;
  Localidad: string;
  'Longitud (WGS84)': string;
  Margen: string;
  Municipio: string;
  PrecioProducto: number;
  Provincia: string;
  Remisión: string;
  Rótulo: string;
  Tipo_x0020_Venta: string;
  IDEESS: number;
  IDMunicipio: number;
  IDProvincia: number;
  IDCCAA: number;
};

type GetGasolineras = {
  Fecha: string;
  ListaEESSPrecio: Gasolinera[];
  Nota: string;
  ResultadoConsulta: string;
};

async function getListaGasolinerasByCPandIdComb(
  CP: number,
  idComb: string,
  directory: string,
) {
  const resultResponse = await getResponseAPIGasolineras(idComb);

  const result: GasolineraFinal[] = [];

  // Gets all Gasolineras that have the CP correct
  resultResponse.ListaEESSPrecio.forEach(function (value) {
    if (value['C.P.'] == CP) {
      const aux: GasolineraFinal = {
        Nombre: value.Rótulo,
        Precio: value.PrecioProducto,
        Direccion: value.Dirección,
        GoogleMaps:
          'https://www.google.com/maps/search/?api=1&query=' +
          value.Latitud.replace(/,/g, '.') +
          ',' +
          value['Longitud (WGS84)'].replace(/,/g, '.'),
      };
      result.push(aux);
    }
  });

  // If there is no Gasolinera, throw error because CP is not correct
  if (result.length == 0) throw new Error();

  // Sorts the array by price
  const sortedResult: GasolineraFinal[] = result.sort((n1, n2) => {
    if (n1.Precio > n2.Precio) return 1;
    if (n1.Precio < n2.Precio) return -1;
    return 0;
  });

  const [dateComponents, timeComponents] = resultResponse.Fecha.split(' ');

  const [day, month, year] = dateComponents.split('/');
  const [hours, minutes, seconds] = timeComponents.split(':');

  const date = new Date(+year, +month - 1, +day, +hours, +minutes, +seconds);

  const fileToSave: GetGasolinerasFinal = {
    Fecha: date,
    ListaGasolineras: sortedResult,
  };

  // Saves the query for cache
  saveGasolineras(JSON.stringify(fileToSave), directory);
}

// Gets general query by id of the combustible
async function getResponseAPIGasolineras(idComb: string) {
  const response = await fetch(
    join(
      'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProducto',
      idComb,
    ),
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    },
  );

  return (await response.json()) as GetGasolineras;
}

async function saveGasolineras(data: any, directory: string) {
  fs.writeFileSync(directory, data, {
    flag: 'w',
  });
}
