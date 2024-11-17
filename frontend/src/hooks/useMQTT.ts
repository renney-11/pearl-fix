"use client";

// add useMQTT hook to handle MQTT
import { useState, useEffect } from "react";
import { connect, Client } from "mqtt";

const useMQTT = () => {
  const [client, setClient] = useState<Client | null>(null);

  useEffect(() => {
    const client = connect("ws://localhost:9001");

    setClient(client);

    return () => {
      client.end();
    };
  }, []);

  return client;
};
