import { createContext, useContext, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Project } from "@shared/schema";

interface ProjectContextType {
  currentProject: Project | null;
  setCurrentProject: (p: Project | null) => void;
  projects: Project[];
  isLoading: boolean;
}

const ProjectContext = createContext<ProjectContextType>({
  currentProject: null,
  setCurrentProject: () => {},
  projects: [],
  isLoading: false,
});

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null);

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    staleTime: 30000,
  });

  useEffect(() => {
    if (projects.length === 0) return;
    const savedId = localStorage.getItem("currentProjectId");
    if (savedId) {
      const found = projects.find(p => p.id === savedId);
      if (found) { setCurrentProjectState(found); return; }
    }
    setCurrentProjectState(projects[0]);
  }, [projects]);

  const setCurrentProject = (p: Project | null) => {
    setCurrentProjectState(p);
    if (p) localStorage.setItem("currentProjectId", p.id);
    else localStorage.removeItem("currentProjectId");
  };

  return (
    <ProjectContext.Provider value={{ currentProject, setCurrentProject, projects, isLoading }}>
      {children}
    </ProjectContext.Provider>
  );
}

export const useProject = () => useContext(ProjectContext);
