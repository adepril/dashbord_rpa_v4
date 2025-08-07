'use client'

// Importations pour la création de graphiques avec Recharts
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts"
// Importation de React ainsi que des hooks pour gérer l'état et les effets
import React, { useState, useEffect, useCallback } from 'react';
// Importations pour interagir avec Firebase Firestore (bien que non utilisé directement ici)
import { collection, getDocs } from 'firebase/firestore';
// Fonction utilitaire permettant de formater des valeurs de temps/durée
import { formatDuration } from '../lib/utils'
// Importation des types et des données mises en cache concernant les robots 
import { Robot, cachedRobots4Agencies, subscribeToRobotData, unsubscribeFromRobotData } from '../utils/dataStore';

// Définition des propriétés que ce composant attend
interface ChartProps {
  robotType: string
  data1: any
  totalCurrentMonth: number
  totalPrevMonth1: number 
  totalPrevMonth2: number
  totalPrevMonth3: number
  selectedMonth: string, // 'N', 'N-1', 'N-2', 'N-3'
  setSelectedMonth: (month: string) => void
  monthLabelCurrent: string
  monthLabelPrev1: string
  monthLabelPrev2: string
  monthLabelPrev3: string
}

// Interface définissant les propriétés utilisées pour personnaliser l'affichage des ticks sur l'axe X
interface CustomizedAxisTickProps {
  x: number;
  y: number;
  payload: {
    value: string;
  };
}

// Composant pour personnaliser l'affichage d'un tick de l'axe X avec une rotation pour une meilleure lisibilité
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

// Composant principal d'affichage du graphique et des infos additionnelles sur les robots
export default function Chart({ robotType, data1, selectedMonth, setSelectedMonth, totalCurrentMonth, totalPrevMonth1, totalPrevMonth2, totalPrevMonth3, monthLabelCurrent, monthLabelPrev1, monthLabelPrev2, monthLabelPrev3 }: ChartProps) {

console.log('Chart4All: Initialisation - data1:', data1, 'robotType:', robotType, 'selectedMonth:', selectedMonth);

// États locaux du composant :
// robots : tableau de robots filtrés pour l'affichage dans la section "Le saviez-vous ?"
// currentIndex : index du robot actuellement affiché dans le diaporama
// isPaused : booléen indiquant si le défilement automatique des robots est en pause
// error : message d'erreur éventuel pour l'affichage
  const [robots, setRobots] = useState<Robot[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Effet pour gérer le défilement automatique du carrousel
  useEffect(() => {
    //console.log('Chart4All: Initialisation du carrousel');
    
    const handleRobotDataUpdate = () => {
      //console.log('Chart4All: Mise à jour des données robots', cachedRobots4Agencies.length);
      const filteredRobots = cachedRobots4Agencies.filter(robot => robot.type_gain !== 'temps');
      //console.log('Chart4All: Robots filtrés', filteredRobots.length);
      setRobots(filteredRobots);
    };

    subscribeToRobotData(handleRobotDataUpdate);
    handleRobotDataUpdate(); // Appel initial

    return () => {
      unsubscribeFromRobotData(handleRobotDataUpdate);
    };
  }, []);

  useEffect(() => {
    //console.log('Chart4All: Vérification du défilement', { robotsLength: robots.length, isPaused });
    if (robots.length > 0 && !isPaused) {
      //console.log('Chart4All: Démarrage du défilement automatique');
      const interval = setInterval(() => {
        setCurrentIndex(prevIndex => {
          const newIndex = (prevIndex + 1) % robots.length;
          //console.log('Chart4All: Changement de robot', { prevIndex, newIndex });
          return newIndex;
        });
      }, 5000); // Change de robot toutes les 5 secondes pour les tests

      return () => {
        //console.log('Chart4All: Arrêt du défilement');
        clearInterval(interval);
      };
    }
  }, [robots, isPaused]);

  // Fonction pour changer l'état de pause/reprise du diaporama
  const handlePauseResume = () => {
    setIsPaused(prev => !prev);
  };

  // Vérification de la présence des données de reporting essentielles (sinon affichage d'un message d'erreur)
  if (!data1 || !data1['NB UNITES DEPUIS DEBUT DU MOIS']) {
    return (
      <div className="flex justify-center items-center h-[400px] text-gray-500">
        Aucune donnée de reporting disponible pour ce robot
      </div>
    );
  }

  // Détermination de la date en fonction du mois sélectionné
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

  // Ajustement si on est le 1er du mois, pour afficher les données du mois précédent par défaut
  if (currentDate.getDate() === 1 ){
    if (displayMonth === 1) {
      displayMonth = 12;
      displayYear -= 1;
    } else {
      displayMonth -= 1;
    }
  }

// Construction des données pour le graphique sur 31 jours :
// Pour chaque jour, recherche une valeur dans data1 ou attribue 0 par défaut
  // Chart 1
  const chartData = Array.from({ length: 31 }, (_, i) => {
    const day = (i + 1).toString().padStart(2, '0');
    const dateKey = `${day}/${displayMonth.toString().padStart(2, '0')}/${displayYear}`;
    let value = 0;
    if (data1 && data1[dateKey]) {
      value = Number(data1[dateKey]);
    }
    return {
      date: dateKey,
      valeur: value
    };
  }); // Chart 1
  // Si toutes les valeurs sont nulles, affichage d'un message informant l'utilisateur
  if (chartData.every(item => item.valeur === 0)) {
    return (
      <div className="flex justify-center items-center h-[400px] text-gray-500">
        L'histogramme ne peut être généré car aucune donnée disponible pour ce robot
      </div>
    );
  }
// Rendu principal du composant réparti en deux sections :
// 1. Affichage de l'histogramme (gain de temps) et des totaux mensuels
// 2. Section "Le saviez-vous ?" affichant des informations supplémentaires sur les robots
  return (
    <>
    {/* Section gauche : Histogramme et totaux */}
    <div className="w-full flex justify- gap-4 items-center ">
        
        <div className="w-2/3 pt-4 pb-2 bg-white rounded-lg shadow ml-2">

          <div className="h-[300px] relative">
            <div className="ml-[10%] text-left text-xl font-bold mb-4">Gain de temps</div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                width={600}
                height={600}
                barSize={40}
                barGap={15}
                title=""
                margin={{ top: 20, right: 10, left: 5, bottom: 1 }}
              >
                <XAxis
                  dataKey="date"
                  stroke="#888888"
                  tickLine={false}
                  axisLine={false}
                  tick={<CustomizedAxisTick x={0} y={0} payload={{
                    value: ""
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
                  tickFormatter={(value: number) => formatDuration(value)}
                  fontSize={10} />
                <Tooltip
                  labelFormatter={(label: string) => label}
                  formatter={(value: any, name: string, props: any) => {
                    const valeur  = props.payload;
                    if ((valeur === undefined || valeur === 0) ) {
                      return [''];
                    }
                    const gain = `Gain : ${formatDuration(valeur.valeur)}`;
                    return [gain];
                  } } />
                <Bar
                  dataKey="valeur"
                  fill="#3498db"
                  radius={[4, 4, 0, 0]}
                  name="Quantité"
                  label={{
                    position: 'top',
                    fill: '#000',
                    fontSize: 10,
                    formatter: (value: number) => value === 0 ? '' : formatDuration(value)
                  }}
                  activeBar={{ fill: robotType?.toLowerCase() === "temps" ? '#3498db' : '#3333db' }}
                  />
              </BarChart>
            </ResponsiveContainer>
          </div>

          
            {/* Widgets des totaux mensuels */}
            <div className="flex justify-around ">
              <div className="w-full grid grid-cols-4 gap-4 mt-12 mb-4 ml-5 mr-5 rounded-lg ">

                <div className={selectedMonth?.toLowerCase()==='n' ? ('bg-[#3333db] text-white shadow-md rounded-lg py-2 cursor-pointer') : ('bg-[#3498db] hover:bg-[#3333db] text-white shadow-md rounded-lg py-2 cursor-pointer')} onClick={() => setSelectedMonth('N')}>
                  <h3 className="text-2lg font-semibold pl-2">{monthLabelCurrent}</h3>
                  <p className="text-2xl  font-bold pl-5">{formatDuration(totalCurrentMonth)}</p>
                </div>
                <div className={selectedMonth?.toLowerCase()==='n-1' ? ('bg-[#3333db] text-white shadow-md rounded-lg py-2 cursor-pointer') : ('bg-[#3498db] hover:bg-[#3333db] text-white shadow-md rounded-lg py-2 cursor-pointer')} onClick={() => setSelectedMonth('N-1')}>
                  <h3 className="text-2lg font-semibold pl-2">{monthLabelPrev1}</h3>
                  <p className="text-2xl font-bold pl-5 ">{formatDuration(totalPrevMonth1)}</p>
                </div>
                <div className={selectedMonth?.toLowerCase()==='n-2' ? ('bg-[#3333db] text-white shadow-md rounded-lg py-2 cursor-pointer') : ('bg-[#3498db] hover:bg-[#3333db] text-white shadow-md rounded-lg py-2 cursor-pointer')} onClick={() => setSelectedMonth('N-2')}>
                  <h3 className="text-2lg font-semibold pl-2">{monthLabelPrev2}</h3>
                  <p className="text-2xl font-bold pl-5">{formatDuration(totalPrevMonth2)}</p>
                </div>
                <div className={selectedMonth?.toLowerCase()==='n-3' ? ('bg-[#3333db] text-white shadow-md rounded-lg py-2 cursor-pointer') : ('bg-[#3498db] hover:bg-[#3333db] text-white shadow-md rounded-lg py-2 cursor-pointer')} onClick={() => setSelectedMonth('N-3')}>
                  <h3 className="text-2lg font-semibold pl-2">{monthLabelPrev3}</h3>
                  <p className="text-2xl font-bold pl-5">{formatDuration(totalPrevMonth3)}</p>
                </div>

              </div>
            </div>

        </div>
        
         {/* Section droite : Informations complémentaires sur les robots ("Le saviez-vous ?") */}
        <div className="w-1/3 p-4 pb-12 bg-white rounded-lg shadow ml-2">
            <div className="h-[380px] relative">
              <div className="flex flex-col justify-center items-center mt-5 bg-x-100">
                <span className="text-red-700 text-3xl font-bold">Le saviez-vous ?</span>
              </div>
              <div className="h-[10px] bg-x-200"></div>
              <div className="mt-4 text-red-500">{error}</div>
                {robots.length > 0 ? (
                  <>
                    <div className="mt-4 px-4 pt-10" >
                      Robot : <span className="font-bold">{robots[currentIndex]?.robot}</span>
                    </div>
                    <div className="mt-2 px-4 " >
                      Agence : <span className="font-">{robots[currentIndex]?.agenceLbl}</span>
                    </div>
                    <div className="mt-4 px-4 ">
                      {robots[currentIndex]?.description_long}
                    </div>
                    <div className="h-[10px] bg-x-200"></div>
                    <div className="mt-4 px-4">
                      {robots[currentIndex]?.currentMonth !== undefined ? (
                      <table className="w">
                        <tbody>
                          <tr>
                            <td>Nombre d'exécution du mois :</td>
                            <td>{robots[currentIndex]?.currentMonth !== undefined ? (robots[currentIndex].currentMonth!) : 'N/A'}</td>
                          </tr>
                          <tr>
                            <td>Nb d'exécution {(() => {
                              const mois = new Date(new Date().setMonth(new Date().getMonth() - 1)).toLocaleString('fr-FR', { month: 'long' });
                              return ['avril', 'août', 'octobre'].includes(mois) ? "d'" + mois : 'de ' + mois
                            })()} :</td>
                            <td>{robots[currentIndex]?.previousMonth !== undefined ? (robots[currentIndex].previousMonth!) : 'N/A'}</td>
                          </tr>
                        </tbody>
                      </table>
                      ) : (
                        <div className="mt-4 text-gray-500"></div>
                      )}
                    </div>

                    <div className="absolute bottom-1 left-0 right-0 flex gap-2 items-center justify-center">
                      <button
                        onClick={() => setCurrentIndex(prev => prev > 0 ? prev - 1 : robots.length - 1)}
                        className="px-2 pb-[2px] bg-red-800 hover:bg-red-700 text-white rounded "
                      >
                        ←
                      </button>
                      <button
                        onClick={handlePauseResume}
                        className="px-3 py-0 pb-[2px] bg-red-800 hover:bg-red-700 text-white rounded"
                      >
                        {isPaused ? '▶' : '||'}
                      </button>
                      <button
                        onClick={() => setCurrentIndex(prev => (prev + 1) % robots.length)}
                        className="px-2 pb-[2px] bg-red-800 hover:bg-red-700 text-white rounded"
                      >
                        →
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="mt-4 text-gray-500">Aucune information disponible</div>
                )}
            </div>

        </div>

    </div>
    </>
  );
}
