'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

import { Agency } from '../utils/dataStore';

interface AgencySelectorProps {
  agencies: Agency[];
  selectedAgencyId: string;
  onAgencyChange: (agencyId: string) => void;
}

import { getRobotsByAgency, cachedRobots, Program, updateRobots } from '../utils/dataStore';

export default function AgencySelector({ agencies, selectedAgencyId, onAgencyChange }: AgencySelectorProps) {
  const handleAgencyChange = (agencyId: string) => {
    onAgencyChange(agencyId);
    const robots = getRobotsByAgency(agencyId);
    updateRobots(robots);
  };

  const agencySelect = (
    <Select value={selectedAgencyId || undefined} onValueChange={handleAgencyChange}>
      <SelectTrigger className="bg-white border border-gray-300 rounded-md h-9 w-[250px] text-sm">
        <SelectValue placeholder="Sélectionnez une agence">
          {agencies.length > 0
            ? (agencies.find(a => a.idAgence === selectedAgencyId)?.libelleAgence || agencies.find(a => a.idAgence === selectedAgencyId)?.nomAgence)
            : "TOUT"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-white border border-gray-300 rounded-md w-[350px]">
        {agencies.length > 0 ? (
          agencies.map((agency) => {
            const displayText = agency.libelleAgence?.trim() || agency.nomAgence;
            const agencyRobots = getRobotsByAgency(agency.idAgence);
            const hasRobots = agencyRobots.length > 1;
            
            return (
              <SelectItem
                key={agency.idAgence}
                value={agency.idAgence}
                disabled={!hasRobots}
                className={`text-sm ${!hasRobots ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
              >
                {displayText}
              </SelectItem>
            );
          })
        ) : (
          <SelectItem value="TOUT" className="text-sm hover:bg-gray-100">
            TOUT
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );

  return agencySelect;
}
