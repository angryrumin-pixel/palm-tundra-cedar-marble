import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Desk } from "@/components/pult/desk";
import { usePult } from "@/lib/streams/store";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  useEffect(() => {
    void usePult.persist.rehydrate();
  }, []);
  return <Desk />;
}
