'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

import { Program } from '../utils/dataStore';

interface ProgramSelectorProps {
  robots: Program[];
  selectedProgramId: string;
  onProgramChange: (program: string) => void;
}

function verboseName(program: Program | undefined): string {
  if (!program) return "";
  return program.robot === "TOUT" ? "TOUT" : `${program.robot}`; //(${program.agence})`; 
}

export default function ProgramSelector({ robots, selectedProgramId, onProgramChange }: ProgramSelectorProps) {
  // Utiliser la liste complète des robots sans éliminer les doublons
  const programs = robots;
  
  return (
    <Select value={selectedProgramId} onValueChange={onProgramChange}>
      <SelectTrigger className="bg-white border border-gray-300 rounded-md h-9 w-[300px] text-sm">
      <SelectValue placeholder="Sélectionnez un programme">
                {verboseName(programs.find((p: Program) => p.id_robot === selectedProgramId))}
      </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-white border border-gray-300 rounded-md w-[350px]">
        {programs.map((program: Program, index: number) => (
          <SelectItem 
            key={program.id_robot || index.toString()} 
            value={program.id_robot || index.toString()}
            className="text-sm hover:bg-gray-100"
          >
            {verboseName(program)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
