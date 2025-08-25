'use client'

// Importations pour la création de graphiques avec Recharts
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine, Rectangle } from "recharts"
// Importation de React ainsi que des hooks pour gérer l'état et les effets
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import UsersTableModal from './UsersTableModal';
// Importations pour interagir avec Firebase Firestore (bien que non utilisé directement ici)
import { collection, getDocs } from 'firebase/firestore';
// Fonction utilitaire permettant de formater des valeurs de temps/durée
import { formatDuration } from '../lib/utils'
// Importation des types et des données mises en cache concernant les robots 
import { Robot, cachedRobots4Agencies, cachedReportingData, getReportingDataForRobot, subscribeToRobotData, unsubscribeFromRobotData } from '../utils/dataStore';

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
  selectedService: string
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

// Composant personnalisé pour la forme de la barre afin de gérer la couleur persistante
const CustomBarShape = (props: any) => {
  const { fill, x, y, width, height, index, showRobotListTooltip, clickedBarIndex } = props;

  // Si la modale est ouverte et que c'est la barre cliquée, utilisez #3333db
  const barFill = (showRobotListTooltip && clickedBarIndex === index) ? '#3333db' : fill;

  return <Rectangle x={x} y={y} width={width} height={height} fill={barFill} />;
};

// Composant principal d'affichage du graphique et des infos additionnelles sur les robots
export default function Chart({ robotType, data1, selectedMonth, setSelectedMonth, totalCurrentMonth, totalPrevMonth1, totalPrevMonth2, totalPrevMonth3, monthLabelCurrent, monthLabelPrev1, monthLabelPrev2, monthLabelPrev3, selectedService }: ChartProps) {

//console.log('Chart4All: Initialisation - data1:', data1, 'selectedService:', selectedService);
//console.log('Chart4All: cachedRobots4Agencies ', cachedRobots4Agencies);

// États locaux du composant :
// robots : tableau de robots filtrés pour l'affichage dans la section "Le saviez-vous ?"
// currentIndex : index du robot actuellement affiché dans le diaporama
// isPaused : booléen indiquant si le défilement automatique des robots est en pause
// error : message d'erreur éventuel pour l'affichage
  const [robots, setRobots] = useState<Robot[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRobotListTooltip, setShowRobotListTooltip] = useState(false);
  const [robotDataForTooltip, setRobotDataForTooltip] = useState<{ date: string; valeur: number; aggregatedRobotDetails: { name: string, temps_par_unite: string, nombre_traitements_journaliers: number }[]; } | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number; } | null>(null);
  const [clickedBarIndex, setClickedBarIndex] = useState<number | null>(null); // Nouvel état pour l'index de la barre cliquée
  const [showUsersTableModal, setShowUsersTableModal] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const handleBarClick = useCallback((data: any, index: number, event: React.MouseEvent) => {
    //console.log('Chart4All: Double-clic sur la barre', data, event);
    if (data.valeur > 0 && data.aggregatedRobotDetails && data.aggregatedRobotDetails.length > 0) {
        setRobotDataForTooltip(data);
        setShowRobotListTooltip(true);
        setTooltipPosition({ x: event.clientX, y: event.clientY });
        setClickedBarIndex(index); // Mettre à jour l'index de la barre cliquée
    } else {
        setRobotDataForTooltip(null);
        setShowRobotListTooltip(false);
        setTooltipPosition(null);
        setClickedBarIndex(null); // Réinitialiser l'index si la modale se ferme
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Effet pour gérer le défilement automatique du carrousel
  useEffect(() => {
    //console.log('Chart4All: Initialisation du carrousel');
    //console.log('Chart4All: cachedRobots4Agencies ', cachedRobots4Agencies);
    
    const handleRobotDataUpdate = () => {
      //console.log('Chart4All: Mise à jour des données robots', cachedRobots4Agencies.length);
      const filteredRobots = cachedRobots4Agencies.filter(robot => robot.type_gain !== 'TEMPS (mn)');
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
    if (robots.length > 0 && !isPaused) {
      const interval = setInterval(() => {
        setCurrentIndex(prevIndex => {
          const newIndex = (prevIndex + 1) % robots.length;
          return newIndex;
        });
      }, 20000); 

      return () => {
        //console.log('Chart4All: Arrêt du défilement');
        clearInterval(interval);
      };
    }
  }, [robots, isPaused]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
            setShowRobotListTooltip(false);
            setRobotDataForTooltip(null);
            setTooltipPosition(null);
            setClickedBarIndex(null); // Réinitialiser l'index de la barre cliquée lors de la fermeture de la modale
        }
    };

    if (showRobotListTooltip) {
        document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
}, [showRobotListTooltip, setShowRobotListTooltip, setRobotDataForTooltip, setTooltipPosition]); // eslint-disable-line react-hooks/exhaustive-deps

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
    // Inclure aggregatedRobotNames pour chaque point de donnée
    // data1 vient de Dashboard.tsx et contient déjà aggregatedRobotNames
    return {
      date: dateKey,
      valeur: value,
      aggregatedRobotDetails: (data1.aggregatedRobotNames || [])
        .map((robotName: string) => {
          const robotDetail = cachedRobots4Agencies.find(robot => robot.robot === robotName);

          if (!robotDetail) return null;

          const dayOfMonth = new Date(dateKey.split('/').reverse().join('-')).getDate();
          const dayProperty = `JOUR${dayOfMonth}`; // Assumons que la propriété est 'jourX'

          const robotId = `${robotDetail.agence}_${robotName}`;
          const reportingEntry = getReportingDataForRobot(robotId, selectedMonth);
          const nombreTraitementsJournaliers = reportingEntry ? (reportingEntry as any)[dayProperty] || 0 : 0;

          return {
            name: robotName,
            temps_par_unite: robotDetail.temps_par_unite,
            nombre_traitements_journaliers: nombreTraitementsJournaliers
          };
        })
        .filter(Boolean)
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
            <div className="flex justify-between items-center mb-4">
              <div className="ml-[10%] text-left text-xl font-bold">Gain de temps</div>
              {selectedService.toLowerCase() === 'douane' && (
                <Button
                  onClick={() => setShowUsersTableModal(true)}
                  //className="mr-4 bg-[#3498db] hover:bg-[#3333db] text-white"
                  className="bg-neutral-950 text-neutral-100 border border-neutral-400 border-b-4 font-medium relative px-3 py-1 mr-2 rounded-lg hover:brightness-150 hover:border-t-4 active:opacity-75 duration-300"
                >
                  Tableau des utilisateurs Douane
                </Button>
              )}
            </div>
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
                  tick={(props: any) => (
                    <CustomizedAxisTick {...props} />
                  )}
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
                  content={({ payload, label }) => {
                    if (!payload || payload.length === 0) return null;
                    const { valeur, date, aggregatedRobotDetails } = payload[0].payload;
                    if (valeur === undefined || valeur === 0) return null;

                    const gain = `Gain : ${formatDuration(valeur)}`;
                    const dateFormatted = new Date(date.split('/').reverse().join('-')).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

                    return (
                      <div className="bg-white shadow-md p-2 border border-gray-200 rounded text-sm">
                        <p className="font-bold">{dateFormatted}</p>
                        <p className="text-gray-600">{gain}</p>
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
                    formatter: (value: number) => value === 0 ? '' : formatDuration(value)
                  }}
                  onClick={(data: any, index: number, event: React.MouseEvent) => handleBarClick(data, index, event)}
                  shape={<CustomBarShape showRobotListTooltip={showRobotListTooltip} clickedBarIndex={clickedBarIndex} />}
                  activeBar={{
                    fill: '#3333db' // Couleur de survol standard
                  }}
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
                  {showRobotListTooltip && robotDataForTooltip && tooltipPosition && (
                      <div
                          ref={tooltipRef}
                          className="fixed bg-gray-200 shadow-lg p-4 rounded-lg border-2 border-black z-50 max-w-4xl"
                          style={{ left: tooltipPosition.x + 10, top: tooltipPosition.y + 10 }} // Décalage pour ne pas superposer le curseur
                      >
                          <button
                              onClick={() => setShowRobotListTooltip(false)}
                              className="absolute top-1 right-2 text-gray-500 hover:text-gray-700"
                          >
                              &times;
                          </button>
                          <p className="text-gray-600  text-center">{new Date(robotDataForTooltip.date.split('/').reverse().join('-')).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                          <p className="font-bold text-center"> {robotDataForTooltip.aggregatedRobotDetails.length} robot{robotDataForTooltip.aggregatedRobotDetails.length > 1 ? 's' : ''} 
                            &nbsp;- Gain : {formatDuration(robotDataForTooltip.valeur)}</p>
                          {robotDataForTooltip.aggregatedRobotDetails && robotDataForTooltip.aggregatedRobotDetails.length > 0 && (
                              <>
                                  <p className="text-gray-600 text-sm mt-2"> &nbsp;Les meilleurs gains de temps :</p>
                                  <div className="overflow-x-auto max-h-100">
                                      <table className="min-w-full border-collapse text-sm">
                                          <thead>
                                              <tr className="bg-gray-100">
                                                  <th className="border border-gray-300 px-4 py-2 text-left">Robot</th>
                                                  <th className="border border-gray-300 px-4 py-2 text-left">Nb Traitements</th>
                                                  <th className="border border-gray-300 px-4 py-2 text-left">Temps par unité</th>
                                                  <th className="border border-gray-300 px-4 py-2 text-left">Temps total</th>
                                              </tr>
                                          </thead>
                                          <tbody>
                                              {robotDataForTooltip.aggregatedRobotDetails
                                                  .filter(robot => robot.nombre_traitements_journaliers > 0)
                                                  .sort((a, b) => {
                                                      const timeA = a.nombre_traitements_journaliers * Number(a.temps_par_unite.replace(',', '.'));
                                                      const timeB = b.nombre_traitements_journaliers * Number(b.temps_par_unite.replace(',', '.'));
                                                      return timeB - timeA; // Tri décroissant
                                                  })
                                                  .slice(0, 10)
                                                  .map((robot: { name: string, temps_par_unite: string, nombre_traitements_journaliers: number }, index: number) => (
                                                      <tr key={index} className="hover:bg-gray-50">
                                                          <td className="border border-gray-300 px-4 py-2">{robot.name}</td>
                                                          <td className="border border-gray-300 px-4 py-2 text-center">{robot.nombre_traitements_journaliers}</td>
                                                          <td className="border border-gray-300 px-4 py-2 text-center">{robot.temps_par_unite} min/unité</td>
                                                          <td className="border border-gray-300 px-4 py-2 text-center">{formatDuration(robot.nombre_traitements_journaliers * Number(robot.temps_par_unite.replace(',', '.')))}</td>
                                                      </tr>
                                                  ))}
                                          </tbody>
                                      </table>
                                  </div>
                              </>
                          )}
                      </div>
                  )}
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
    
    <UsersTableModal
      open={showUsersTableModal}
      onOpenChange={setShowUsersTableModal}
    />
    </>
  );
}
