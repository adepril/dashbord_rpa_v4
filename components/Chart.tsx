'use client'

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts"
import React, { useState, useEffect } from 'react';
import { formatDuration } from '../lib/utils'
import { Robot, cachedRobots4Agencies } from '../utils/dataStore';

interface ChartProps {
  robotType: string
  data: any
  selectedAgency: string
  selectedMonth: string
  setSelectedMonth: (month: string) => void
  totalCurrentMonth: number
  totalPrevMonth1: number
  totalPrevMonth2: number
  totalPrevMonth3: number
  monthLabelCurrent: string;
  monthLabelPrev1: string;
  monthLabelPrev2: string;
  monthLabelPrev3: string;
}

interface CustomizedAxisTickProps {
  x: number;
  y: number;
  payload: {
    value: string;
  };
}

const CustomizedAxisTick: React.FC<CustomizedAxisTickProps> = (props) => {
  const { x, y, payload } = props;
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="end"
        fill="#666"
        transform="rotate(-35)"
        fontSize={10}
      >
        {payload.value}
      </text>
    </g>
  );
}

export default function Chart({ robotType, data, selectedAgency, setSelectedMonth,selectedMonth , totalCurrentMonth, totalPrevMonth1, totalPrevMonth2, totalPrevMonth3, monthLabelCurrent, monthLabelPrev1, monthLabelPrev2, monthLabelPrev3 }: ChartProps) {

    // console.log("Chart.tsx - data:", data);
    // console.log("Chart.tsx - selectedmonth:", selectedMonth);
    // console.log("Chart.tsx - totalCurrentMonth:", totalCurrentMonth);
    // console.log("Chart.tsx - totalPrevMonth1:", totalPrevMonth1);
    // console.log("Chart.tsx - totalPrevMonth2:", totalPrevMonth2);
    // console.log("Chart.tsx - totalPrevMonth3:", totalPrevMonth3);
    // console.log("Chart.tsx - monthLabelCurrent:", monthLabelCurrent);
    // console.log("Chart.tsx - monthLabelPrev1:", monthLabelPrev1);
    // console.log("Chart.tsx - monthLabelPrev2:", monthLabelPrev2);
    // console.log("Chart.tsx - monthLabelPrev3:", monthLabelPrev3);
    // console.log("Chart.tsx - robotType:", robotType);


    const [robots, setRobots] = useState<Robot[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const currentDate = new Date();
    let displayMonth = currentDate.getMonth() + 1;
    let displayYear = currentDate.getFullYear();

    if (selectedMonth !== 'N') {
      const monthOffset = parseInt(selectedMonth.split('-')[1]);
      displayMonth -= monthOffset;
      if (displayMonth < 1) {
        displayMonth += 12;
        displayYear -= 1;
      }
    }

    // Ajustement si on est le 1er du mois et mois courant
    if (currentDate.getDate() === 1 ) {
      if (displayMonth === 1) {
        displayMonth = 12;
        displayYear -= 1;
      } else {
        displayMonth -= 1;
      }
    }

  // Generate chart data for the current month
  const chartData = Array.from({ length: 31 }, (_, i) => {
    const day = (i + 1).toString().padStart(2, '0');
    const dateKey = `${day}/${displayMonth.toString().padStart(2, '0')}/${displayYear}`;
    let value = 0;
    // Check if data exists for the given dateKey and assign it to value
    const dayField = `JOUR${i + 1}`; // Utiliser JOUR1, JOUR2, etc.
    if (data && data[dayField]) {
      value = Number(data[dayField]);
    }

    return {
      date: dateKey,
      valeur: value
    };
  });

  return (
  <>
    <div className="w-full flex justify- gap-4 items-center ">

      <div className="w-2/3 pt-4 pb-2 bg-white rounded-lg shadow ml-2">
          <div className="h-[300px] relative ">
            {/* Histogram */}
            {data ? (
              <>
                <div className="ml-[10%] text-left text-xl font-bold mb-4">
                  {robotType?.toLowerCase().includes('temps') ? 'Gain de temps  ('+data.temps_par_unite+' min / traitement)' : 'Sécurisation des processus'} 
                </div>
                <div className="absolute top-2 right-2 text-black px-2 py-1 ">
                  {robotType?.toLowerCase() === "autre" && (
                    "Nombre d'execution"
                  )}
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    width={600}
                    height={500}
                    barSize={40}
                    barGap={15}
                    title=""
                    margin={{ top: 30, right: 10, left: 5, bottom: 1 }}
                  >
                    <XAxis
                      dataKey="date"
                      stroke="#888888"
                      tickLine={false}
                      axisLine={false}
                      tick={<CustomizedAxisTick x={0} y={0} payload={{
                        value: "--"
                      }} />}
                      height={60}
                      tickFormatter={(t) => `${t}`} />
                    <ReferenceLine
                      y={0}
                      stroke="#888888"
                      strokeWidth={1} />
                    <YAxis
                      stroke="#888888"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value: number) => (robotType?.toLowerCase() === "temps" ? formatDuration(value) : `${value}`)}
                      fontSize={10} />
                    <Tooltip
                      labelFormatter={(label: string) => label}
                      // Customize the tooltip content based on the payload and label
                      content={({ payload, label }) => {
                        if (!payload || payload.length === 0) return null;
                        const { valeur, date } = payload[0].payload;
                        if (valeur === undefined || valeur === 0) return null;

                        if (robotType?.toLowerCase() === "temps") {
                          // Calculate gain and number of treatments for 'temps' robotType
                          const gain = 'Gain : ' + formatDuration(valeur);
                          const nbTraitement = 'Nb traitement : ' + (data.temps_par_unite ? Math.round(valeur / data.temps_par_unite) : 'N/A');
                          // Format the date for display
                          const dateFormatted = new Date(date.split('/').reverse().join('-')).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
                          return (
                            <div className="bg-white shadow-md p-2 border border-gray-200 rounded text-sm">
                              <p className="font-bold">{dateFormatted}</p>
                              <p className="text-gray-600">{gain}</p>
                              <p className="text-gray-600">{nbTraitement}</p>  
                            </div>
                          );
                        }

                        // Default tooltip content for other robotTypes
                        return (
                          <div className="bg-white shadow-md p-2 border border-gray-200 rounded text-sm">
                            {valeur > 1 ? `${valeur} éxecutions` : `${valeur} éxecution`}
                          </div>
                        );
                      }} />
                    <Bar
                      dataKey="valeur"
                      fill="#3498db"
                      radius={[4, 4, 0, 0]}
                      name="Quantité"
                      label={{
                        position: 'top',
                        fill: '#000',
                        fontSize: 10,
                        formatter: (value: number) => value === 0 ? '' : (robotType?.toLowerCase() === "temps" ? formatDuration(value) : `${value}`)
                      }}
                      activeBar={{ fill: robotType?.toLowerCase() === "temps" ? '#3333db' : '#c24a0a' }}
                      />
                  </BarChart>
                </ResponsiveContainer>
              </>
            ) : (
              <div className="flex justify-center items-center h-[400px] text-gray-500">
                Aucune donnée disponible
              </div>
            )}
            {/* // fin histogramme */}
          </div>
          
          <div className="flex justify-around ">
            <div className="w-full grid grid-cols-4 gap-4 mt-12 mb-4 ml-5 mr-5 rounded-lg ">
              {data && Object.keys(data).length > 0 ? (
                <>

                    <div className={selectedMonth?.toLowerCase()==='n' ? ('bg-[#3333db] text-white shadow-md rounded-lg py-2 cursor-pointer') : ('bg-[#3498db] hover:bg-[#3333db] text-white shadow-md rounded-lg py-2 cursor-pointer')} onClick={() => setSelectedMonth('N')}>
                      <h3 className="text-2lg font-semibold pl-2">{monthLabelCurrent}</h3>
                      <p className="text-2xl  font-bold pl-5">{formatDuration(totalCurrentMonth)} </p>
                    </div>
                    <div className={selectedMonth?.toLowerCase()==='n-1' ? ('bg-[#3333db] text-white shadow-md rounded-lg py-2 cursor-pointer') : ('bg-[#3498db] hover:bg-[#3333db] text-white shadow-md rounded-lg py-2 cursor-pointer')} onClick={() => setSelectedMonth('N-1')}>
                      <h3 className="text-2lg font-semibold pl-2">{monthLabelPrev1}</h3>
                      <p className="text-2xl font-bold pl-5 ">{formatDuration(totalPrevMonth1)} </p>
                    </div>
                    <div className={selectedMonth?.toLowerCase()==='n-2' ? ('bg-[#3333db] text-white shadow-md rounded-lg py-2 cursor-pointer') : ('bg-[#3498db] hover:bg-[#3333db] text-white shadow-md rounded-lg py-2 cursor-pointer')} onClick={() => setSelectedMonth('N-2')}>
                      <h3 className="text-2lg font-semibold pl-2">{monthLabelPrev2}</h3>
                      <p className="text-2xl font-bold pl-5">{formatDuration(totalPrevMonth2)}</p>
                    </div>
                    <div className={selectedMonth?.toLowerCase()==='n-3' ? ('bg-[#3333db] text-white shadow-md rounded-lg py-2 cursor-pointer') : ('bg-[#3498db] hover:bg-[#3333db] text-white shadow-md rounded-lg py-2 cursor-pointer')} onClick={() => setSelectedMonth('N-3')}>
                      <h3 className="text-2lg font-semibold pl-2">{monthLabelPrev3}</h3>
                      <p className="text-2xl font-bold pl-5">{formatDuration(totalPrevMonth3)}</p>
                    </div>

                </>
              ) : (
              <div className="flex justify-center items-center h-[60px] text-gray-500">
                Aucune donnée disponible
              </div>
              )}
              {/* // fin Indicateurs mensuels */}
            </div>
          </div>
      </div>



      <div className="w-1/3 p-4 pb-12 bg-white rounded-lg shadow ml-2">
          <div className="h-[400px] relative">
            {data ? (
              <>
                <div className="flex justify-center items-center mt-0 bg-x-100">
                  <span className="text-red-700 text-3xl font-bold">Description</span>
                </div>
             
                <div className="mt-5  px-4 pt-6" >
                  Robot : <span className="font-bold">{data.robot}</span>
                </div>         
                <div className="mt-2 ml-4" >
                  Agence : <span className="_font-bold">{data.agenceLbl}</span>
                </div>   
                <div className="mt-2 ml-4" >
                  Service : <span className="font-">{data.service}</span>
                </div>
                <div className="mt-4 px-4 pt-2" >
                {data.description_long}
                </div>      
                <div className="mt-4 px-4 pt-2" >
                Problème : {data.probleme}
                </div>   
                <div className="mt-4 px-4 pt-2" >
                Solution apportée : {data.resultat}
                </div>   
                </>
              ) : (
                <div className="flex justify-center items-center text-center h-[400px] ">
                  <span className="text-gray-500">Aucune donnée disponible</span>
                </div>
              )}
          
          </div>
      </div>

    </div>
  </>
  );
}
