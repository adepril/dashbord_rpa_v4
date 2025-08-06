'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

import { Robot } from '../utils/dataStore';

interface RobotSelectorProps {
  robots: Robot[];
  selectedRobotId: string;
  onRobotChange: (Robot: string) => void;
}

function verboseName(robot: Robot | undefined): string {
  if (!robot) return "";
  // Afficher le nom du robot (mappé depuis NOM_ROBOT). Garder "TOUT" inchangé.
  return robot.robot === "TOUT" ? "TOUT" : `${robot.robot}`; //(${robot.agence})`;
}

export default function RobotSelector({ robots, selectedRobotId, onRobotChange }: RobotSelectorProps) {
  // Utiliser la liste complète des robots sans éliminer les doublons
  // Préfixer par l'option "TOUT" pour permettre l'agrégation au niveau agence
  const robotsList = [
    { id_robot: "TOUT", robot: "TOUT", agence: "" } as Robot,
    ...robots,
  ];

  return (
    <Select value={selectedRobotId} onValueChange={onRobotChange}>
      <SelectTrigger className="bg-white border border-gray-300 rounded-md h-9 w-[300px] text-sm">
        <SelectValue placeholder="Sélectionnez un robot">
          {
            // Si l'id sélectionné correspond à un TOUT (contextualisé ou non), afficher "TOUT"
            (selectedRobotId === 'TOUT' || (selectedRobotId && selectedRobotId.endsWith('_TOUT')))
              ? 'TOUT'
              : verboseName(robotsList.find((r: Robot) => r.id_robot === selectedRobotId))
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-white border border-gray-300 rounded-md w-[350px]">
        {robotsList.map((robot: Robot, index: number) => (
          <SelectItem
            key={(robot.id_robot ?? index.toString())}
            value={(robot.id_robot ?? index.toString())}
            className="text-sm hover:bg-gray-100"
          >
            {verboseName(robot)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
