"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { CalendarIcon, Clock, CheckCircle, User, Trash2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

// Datos estáticos para el calendario
const fechasOcupadas = [
  new Date(2024, 2, 25), // 25 de marzo
  new Date(2024, 2, 26),
  new Date(2024, 2, 27),
  new Date(2024, 2, 28),
  new Date(2024, 3, 1), // 1 de abril
  new Date(2024, 3, 2),
  new Date(2024, 3, 5),
  new Date(2024, 3, 8),
  new Date(2024, 3, 10),
  new Date(2024, 3, 15),
]

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

export default function CalendarioGuardia() {
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [selectedCama, setSelectedCama] = useState<string | undefined>()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [reservaExitosa, setReservaExitosa] = useState(false)

  // Filtrar camas disponibles
  const camasDisponibles = camasData.filter((cama) => cama.status === "disponible")

  // Función para verificar si una fecha está ocupada
  const isDateUnavailable = (date: Date) => {
    return fechasOcupadas.some(
      (d) =>
        d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear(),
    )
  }

  // Función para manejar la reserva
  const handleReserva = () => {
    if (selectedDates.length > 0 && selectedCama) {
      setReservaExitosa(true)
      setTimeout(() => {
        setReservaExitosa(false)
        setIsDialogOpen(false)
        // Limpiar selección después de reservar
        setSelectedDates([])
      }, 2000)
    }
  }

  // Función para eliminar una fecha de la selección
  const removeDateFromSelection = (dateToRemove: Date) => {
    setSelectedDates(
      selectedDates.filter(
        (date) =>
          date.getDate() !== dateToRemove.getDate() ||
          date.getMonth() !== dateToRemove.getMonth() ||
          date.getFullYear() !== dateToRemove.getFullYear(),
      ),
    )
  }

  // Formatear fecha para mostrar
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-750 rounded-lg p-4">
        <Calendar
          mode="multiple"
          selected={selectedDates}
          onSelect={setSelectedDates}
          className="bg-gray-750 text-white border-gray-700 rounded-md mx-auto"
          disabled={isDateUnavailable}
          modifiers={{
            booked: fechasOcupadas,
          }}
          modifiersClassNames={{
            booked: "bg-red-900/30 text-red-300",
          }}
        />
      </div>

      {selectedDates.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Fechas Seleccionadas</h4>
          <ScrollArea className="h-24 rounded-md border border-gray-700 p-2">
            <div className="space-y-2">
              {selectedDates
                .sort((a, b) => a.getTime() - b.getTime())
                .map((date, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-800 p-2 rounded-md">
                    <span className="text-sm text-gray-300">{formatDate(date)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full hover:bg-red-900/50"
                      onClick={() => removeDateFromSelection(date)}
                    >
                      <Trash2 className="h-3 w-3 text-gray-400" />
                    </Button>
                  </div>
                ))}
            </div>
          </ScrollArea>
        </div>
      )}

      <div className="space-y-4 mt-6">
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2">Camas Disponibles</h4>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {camasDisponibles.map((cama) => (
              <Badge
                key={cama.number}
                className={`border py-1.5 cursor-pointer transition-colors ${
                  selectedCama === cama.number.toString()
                    ? "bg-green-800/50 border-green-600 text-white"
                    : "bg-green-900/30 border-green-800 hover:bg-green-800/50"
                }`}
                onClick={() => setSelectedCama(cama.number.toString())}
              >
                Cama {cama.number}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2">Horario</h4>
          <div className="flex items-center justify-between bg-gray-750 p-3 rounded-lg">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-gray-400 mr-2" />
              <span className="text-gray-300">20:00 - 08:00</span>
            </div>
            <Badge className="bg-amber-600">12h</Badge>
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            className="w-full mt-6 bg-red-600 hover:bg-red-700 transform hover:scale-105 transition-all duration-300"
            disabled={selectedDates.length === 0 || !selectedCama}
          >
            Confirmar Reserva
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-gray-800 text-white border-gray-700">
          <DialogHeader>
            <DialogTitle>Confirmar Reserva</DialogTitle>
            <DialogDescription className="text-gray-400">
              Revise los detalles de su reserva antes de confirmar.
            </DialogDescription>
          </DialogHeader>

          {reservaExitosa ? (
            <div className="py-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">¡Reserva Exitosa!</h3>
              <p className="text-gray-400">Su reserva ha sido confirmada.</p>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-1">
                  <Label className="text-gray-400">Fechas Seleccionadas ({selectedDates.length})</Label>
                  <ScrollArea className="h-32 rounded-md border border-gray-700 p-2">
                    <div className="space-y-2">
                      {selectedDates
                        .sort((a, b) => a.getTime() - b.getTime())
                        .map((date, index) => (
                          <div key={index} className="flex items-center bg-gray-750 p-2 rounded-md">
                            <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                            <span className="text-sm text-white">
                              {date.toLocaleDateString("es-ES", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </div>

                <div className="space-y-1">
                  <Label className="text-gray-400">Cama</Label>
                  <div className="p-2 bg-gray-750 rounded-lg text-white flex items-center">
                    <User className="h-4 w-4 mr-2 text-gray-400" />
                    Cama {selectedCama}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-gray-400">Horario</Label>
                  <div className="p-2 bg-gray-750 rounded-lg text-white flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-gray-400" />
                    20:00 - 08:00 (12 horas)
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleReserva}>
                  Confirmar Reserva ({selectedDates.length} {selectedDates.length === 1 ? "día" : "días"})
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

