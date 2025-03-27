"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Clock, CheckCircle, XCircle, AlertTriangle, User, CalendarIcon } from "lucide-react"
import SolicitudesPanel from "@/components/solicitudes-panel"
import CalendarioGuardia from "@/components/calendario-guardia"

// Datos estáticos para las camas
const camasData = [
  { number: 1, status: "ocupada", name: "Juan Pérez", rank: "Capitán" },
  { number: 2, status: "ocupada", name: "María García", rank: "Teniente" },
  { number: 3, status: "disponible", name: null, rank: null },
  { number: 4, status: "disponible", name: null, rank: null },
  { number: 5, status: "ocupada", name: "Carlos López", rank: "Sargento" },
  { number: 6, status: "mantenimiento", name: null, rank: null },
  { number: 7, status: "disponible", name: null, rank: null },
  { number: 8, status: "ocupada", name: "Ana Martínez", rank: "Oficial" },
  { number: 9, status: "disponible", name: null, rank: null },
  { number: 10, status: "disponible", name: null, rank: null },
  { number: 11, status: "ocupada", name: "Roberto Sánchez", rank: "Bombero" },
  { number: 12, status: "disponible", name: null, rank: null },
]

// Datos estáticos para el historial
const historialGuardias = [
  { date: "15/03/2024", cama: 3, horario: "20:00 - 08:00" },
  { date: "08/03/2024", cama: 5, horario: "20:00 - 08:00" },
  { date: "01/03/2024", cama: 2, horario: "20:00 - 08:00" },
  { date: "22/02/2024", cama: 8, horario: "20:00 - 08:00" },
  { date: "15/02/2024", cama: 1, horario: "20:00 - 08:00" },
]

export default function GuardiaNocturna() {
  const [activeTab, setActiveTab] = useState("reservas")
  const [isAdmin, setIsAdmin] = useState(true) // Simulamos que el usuario es admin

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Guardia Nocturna</h1>
          <p className="text-gray-400">Sistema de reserva de camas y gestión de guardias</p>
        </div>
        <div className="flex gap-3">
          <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => setActiveTab("calendario")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Calendario de Guardias</span>
            <span className="sm:hidden">Calendario</span>
          </Button>
          {isAdmin && (
            <Button
              variant="outline"
              className="border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800"
              onClick={() => (window.location.href = "/intranet/guardia-nocturna/admin")}
            >
              <User className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Administración</span>
              <span className="sm:hidden">Admin</span>
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-gray-800 border-gray-700 w-full justify-start overflow-x-auto">
          <TabsTrigger value="reservas" className="data-[state=active]:bg-red-600">
            Reservas
          </TabsTrigger>
          <TabsTrigger value="calendario" className="data-[state=active]:bg-red-600">
            Calendario
          </TabsTrigger>
          <TabsTrigger value="historial" className="data-[state=active]:bg-red-600">
            Historial
          </TabsTrigger>
        </TabsList>
        <TabsContent value="reservas" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Disponibilidad de Camas</CardTitle>
                  <CardDescription className="text-gray-400">
                    Estado actual de las camas para la guardia nocturna
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {camasData.map((cama) => (
                      <div
                        key={cama.number}
                        className={`p-4 rounded-lg border transform hover:scale-105 transition-all duration-300 ${
                          cama.status === "ocupada"
                            ? "bg-red-900/30 border-red-800"
                            : cama.status === "disponible"
                              ? "bg-green-900/30 border-green-800"
                              : "bg-gray-700 border-gray-600"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-white">Cama {cama.number}</span>
                          {cama.status === "ocupada" && <XCircle className="h-4 w-4 text-red-400" />}
                          {cama.status === "disponible" && <CheckCircle className="h-4 w-4 text-green-400" />}
                          {cama.status === "mantenimiento" && <AlertTriangle className="h-4 w-4 text-amber-400" />}
                        </div>
                        <p className="text-xs text-gray-300">
                          {cama.status === "ocupada"
                            ? cama.name
                            : cama.status === "disponible"
                              ? "Disponible"
                              : "En mantenimiento"}
                        </p>
                        {cama.rank && (
                          <Badge className="mt-2 bg-gray-700 text-gray-300 hover:bg-gray-600">{cama.rank}</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Reservar Cama</CardTitle>
                  <CardDescription className="text-gray-400">
                    Seleccione fechas para su guardia nocturna
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CalendarioGuardia />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="calendario" className="mt-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Calendario de Guardias</CardTitle>
              <CardDescription className="text-gray-400">Planificación mensual de guardias nocturnas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                {/* Cabecera de días de la semana */}
                {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day, index) => (
                  <div key={index} className="text-center p-2 font-medium text-gray-400">
                    {day}
                  </div>
                ))}

                {/* Días del mes (ejemplo para marzo 2024) */}
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                  // Determinar si el día tiene guardias asignadas (datos estáticos)
                  const hasGuardia = [1, 5, 8, 12, 15, 19, 22, 25, 28].includes(day)
                  const isWeekend = (day + 4) % 7 === 0 || (day + 4) % 7 === 1 // Sábado o domingo

                  return (
                    <div
                      key={day}
                      className={`p-2 rounded-lg border text-center min-h-[80px] flex flex-col ${
                        hasGuardia
                          ? "bg-red-900/20 border-red-800/50"
                          : isWeekend
                            ? "bg-gray-750 border-gray-700"
                            : "bg-gray-800 border-gray-700"
                      }`}
                    >
                      <span className={`text-sm font-medium ${isWeekend ? "text-gray-500" : "text-white"}`}>{day}</span>
                      {hasGuardia && (
                        <div className="mt-auto">
                          <Badge className="bg-red-800/50 text-red-300 text-xs mt-1 w-full">
                            {Math.floor(Math.random() * 5) + 1} guardias
                          </Badge>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="flex justify-center mt-6 gap-4">
                <Button variant="outline" className="border-gray-700 text-gray-300 hover:text-white">
                  Mes Anterior
                </Button>
                <Button className="bg-red-600 hover:bg-red-700 text-white">Hoy</Button>
                <Button variant="outline" className="border-gray-700 text-gray-300 hover:text-white">
                  Mes Siguiente
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historial" className="mt-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Historial de Guardias</CardTitle>
              <CardDescription className="text-gray-400">Registro de guardias nocturnas realizadas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {historialGuardias.map((guardia, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-750 rounded-lg">
                    <div className="flex items-center">
                      <div className="p-2 bg-red-900/50 rounded-lg mr-4">
                        <Clock className="h-5 w-5 text-red-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{guardia.date}</p>
                        <p className="text-sm text-gray-400">Cama {guardia.cama}</p>
                      </div>
                    </div>
                    <Badge className="bg-gray-700">{guardia.horario}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <SolicitudesPanel departamento="Guardia Nocturna" />
    </div>
  )
}

