'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CalendarIcon, ClockIcon, DropletIcon, BedIcon, TimerIcon as _TimerIcon, GlassWaterIcon, ChevronLeftIcon, ChevronRightIcon, BellIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { format, addMinutes, parse, isBefore, startOfDay, isEqual, isAfter } from "date-fns"
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

type GlassData = {
  time: Date;
  filled: boolean;
}

type DailyData = {
  glasses: GlassData[];
  glassesDrunk: number;
  glassesPending: number;
}

export default function Component() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [sleepStart, setSleepStart] = useState("10:00 PM")
  const [sleepEnd, setSleepEnd] = useState("06:00 AM")
  const [dailyGoal, setDailyGoal] = useState(2000)
  const [reminderInterval, setReminderInterval] = useState(60)
  const [waterData, setWaterData] = useState<Record<string, DailyData>>({})
  const sliderRef = useRef<HTMLDivElement>(null)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const notificationTimeouts = useRef<NodeJS.Timeout[]>([])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (selectedDate) {
      const dateKey = format(selectedDate, 'yyyy-MM-dd')
      if (!waterData[dateKey]) {
        const newDailyData = generateDailyData(selectedDate)
        setWaterData(prev => ({ ...prev, [dateKey]: newDailyData }))
      }
    }
  }, [selectedDate, sleepEnd, reminderInterval, sleepStart])

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted')
    }
  }, [])

  useEffect(() => {
    // Clear existing notification timeouts
    notificationTimeouts.current.forEach(clearTimeout)
    notificationTimeouts.current = []

    // Set up new notification timeouts
    if (notificationsEnabled && selectedDate && isEqual(startOfDay(selectedDate), startOfDay(new Date()))) {
      const dateKey = format(selectedDate, 'yyyy-MM-dd')
      const dayData = waterData[dateKey]
      if (dayData) {
        dayData.glasses.forEach((glass, index) => {
          if (!glass.filled && isAfter(glass.time, new Date())) {
            const timeout = setTimeout(() => {
              sendNotification(`Time to drink water! Glass ${index + 1} of ${dayData.glasses.length}`)
            }, glass.time.getTime() - new Date().getTime())
            notificationTimeouts.current.push(timeout)
          }
        })
      }
    }

    return () => {
      notificationTimeouts.current.forEach(clearTimeout)
    }
  }, [notificationsEnabled, selectedDate, waterData])

  const formatTime = (date: Date) => {
    return format(date, "h:mm a")
  }

  const calculateMlPerInterval = useCallback(() => {
    const sleepStartTime = parse(sleepStart, 'hh:mm a', new Date())
    let sleepEndTime = parse(sleepEnd, 'hh:mm a', new Date())
    if (sleepEndTime <= sleepStartTime) {
      sleepEndTime = addMinutes(sleepEndTime, 24 * 60) // Add 24 hours if end time is on next day
    }
    
    let awakeMinutes = (sleepStartTime.getTime() - sleepEndTime.getTime()) / (1000 * 60)
    if (awakeMinutes < 0) awakeMinutes += 24 * 60 // Add 24 hours if negative
    
    // Calculate intervals, rounding down and adding 1 for the sleep start interval
    const intervalsPerDay = Math.floor(awakeMinutes / reminderInterval) + 1
    const mlPerInterval = Math.round(dailyGoal / intervalsPerDay)

    return { mlPerInterval, intervalsPerDay }
  }, [sleepStart, sleepEnd, reminderInterval, dailyGoal])

  const generateDailyData = useCallback((date: Date): DailyData => {
    const { intervalsPerDay } = calculateMlPerInterval()
    const glasses: GlassData[] = []
    const startTime = parse(sleepEnd, 'hh:mm a', date)
    
    for (let i = 0; i < intervalsPerDay; i++) {
      glasses.push({
        time: addMinutes(startTime, i * reminderInterval),
        filled: false
      })
    }
    
    return {
      glasses,
      glassesDrunk: 0,
      glassesPending: 0
    }
  }, [calculateMlPerInterval, sleepEnd, reminderInterval])

  const handleGlassClick = (index: number) => {
    if (selectedDate) {
      const dateKey = format(selectedDate, 'yyyy-MM-dd')
      const newWaterData = { ...waterData }
      const dayData = newWaterData[dateKey]

      if (dayData && isBefore(dayData.glasses[index].time, currentDate)) {
        dayData.glasses[index].filled = !dayData.glasses[index].filled
        dayData.glassesDrunk = dayData.glasses.filter(glass => glass.filled).length
        dayData.glassesPending = dayData.glasses.filter(glass => !glass.filled && isBefore(glass.time, currentDate)).length

        setWaterData(newWaterData)

        if (dayData.glasses[index].filled) {
          sendNotification(`Great job! You've drunk ${dayData.glassesDrunk} glasses of water today.`)
        }
      }
    }
  }

  const scrollSlider = (direction: 'left' | 'right') => {
    if (sliderRef.current) {
      const scrollAmount = 200 // Adjust this value to change scroll distance
      sliderRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission()
        setNotificationsEnabled(permission === 'granted')
        if (permission === 'granted') {
          toast.success('Notifications enabled successfully!', {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          })
        } else {
          toast.error('Please enable notifications in your browser settings to receive reminders.', {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          })
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error)
        toast.error('An error occurred while enabling notifications. Please try again.', {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        })
      }
    } else {
      toast.error('Your browser does not support notifications.', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      })
    }
  }

  const sendNotification = (message: string) => {
    if (notificationsEnabled) {
      new Notification('Water Reminder', {
        body: message,
        icon: '/water-icon.png' // Make sure to add this icon to your public folder
      })
    }
  }

  const { mlPerInterval } = calculateMlPerInterval()

  const selectedDayData = selectedDate ? waterData[format(selectedDate, 'yyyy-MM-dd')] : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-blue-200 p-8">
      <Card className="max-w-4xl mx-auto overflow-hidden shadow-xl">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
          <CardTitle className="text-3xl font-bold flex items-center justify-center">
            <DropletIcon className="mr-2" />
            Water Reminder
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="mb-6">
            <Button 
              onClick={requestNotificationPermission} 
              disabled={notificationsEnabled}
              className="w-full py-3 text-lg font-semibold"
            >
              {notificationsEnabled ? 'Notifications Enabled' : 'Enable Notification on Your Device'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow">
                <div className="flex items-center space-x-4">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        modifiers={{
                          completed: (date) => {
                            const dateKey = format(date, 'yyyy-MM-dd')
                            return waterData[dateKey]?.glassesDrunk === waterData[dateKey]?.glasses.length
                          },
                          partial: (date) => {
                            const dateKey = format(date, 'yyyy-MM-dd')
                            return waterData[dateKey]?.glassesDrunk > 0 && waterData[dateKey]?.glassesDrunk < waterData[dateKey]?.glasses.length
                          }
                        }}
                        modifiersStyles={{
                          completed: { backgroundColor: '#4ADE80' },
                          partial: { backgroundColor: '#FDE68A' }
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  <div className="flex items-center">
                    <ClockIcon className="text-blue-500 mr-2" />
                    <span>{formatTime(currentDate)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <BedIcon className="text-blue-500 flex-shrink-0" />
                <div className="flex-grow grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="sleepStart" className="text-xs">Sleep Start</Label>
                    <Input
                      type="time"
                      id="sleepStart"
                      value={format(parse(sleepStart, 'hh:mm a', new Date()), 'HH:mm')}
                      onChange={(e) => setSleepStart(format(parse(e.target.value, 'HH:mm', new Date()), 'hh:mm a'))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="sleepEnd" className="text-xs">Sleep End</Label>
                    <Input
                      type="time"
                      id="sleepEnd"
                      value={format(parse(sleepEnd, 'hh:mm a', new Date()), 'HH:mm')}
                      onChange={(e) => setSleepEnd(format(parse(e.target.value, 'HH:mm', new Date()), 'hh:mm a'))}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <DropletIcon className="text-blue-500 flex-shrink-0" />
                <div className="flex-grow grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="dailyGoal" className="text-xs">Daily Goal (ml)</Label>
                    <Input
                      type="number"
                      id="dailyGoal"
                      value={dailyGoal}
                      onChange={(e) => setDailyGoal(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="reminderInterval" className="text-xs">Interval (min)</Label>
                    <Input
                      type="number"
                      id="reminderInterval"
                      value={reminderInterval}
                      onChange={(e) => setReminderInterval(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <GlassWaterIcon className="text-blue-500 flex-shrink-0" />
                <div className="flex-grow grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">ML/Interval</Label>
                    <div className="text-sm font-semibold">{mlPerInterval} ml</div>
                  </div>
                  <div>
                    <Label className="text-xs">Intervals/Day</Label>
                    <div className="text-sm font-semibold">{selectedDayData?.glasses.length || 0}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {selectedDayData && (
            <div className="mt-8 p-4 bg-white rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Water Intake for {format(selectedDate!, 'MMMM d, yyyy')}</h3>
              <div className="relative">
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10"
                  onClick={() => scrollSlider('left')}
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </Button>
                <div 
                  ref={sliderRef}
                  className="flex overflow-x-auto space-x-4 py-2 px-8"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {selectedDayData.glasses.map((glass, index) => (
                    <div key={index} className="flex flex-col items-center flex-shrink-0">
                      <button
                        onClick={() => handleGlassClick(index)}
                        className="focus:outline-none"
                        aria-label={`Glass ${index + 1}`}
                        disabled={!isBefore(glass.time, currentDate) || !isEqual(startOfDay(selectedDate!), startOfDay(currentDate))}
                      >
                        <svg width="30" height="40" viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path
                            d="M5 0H35L30 50H10L5 0Z"
                            fill={glass.filled ? "#4ADE80" : "none"}
                            stroke={isBefore(glass.time, currentDate) && isEqual(startOfDay(selectedDate!), startOfDay(currentDate)) ? "#2563EB" : "#9CA3AF"}
                            strokeWidth="2"
                          />
                        </svg>
                      </button>
                      <span className="text-xs mt-1">{format(glass.time, "h:mm a")}</span>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10"
                  onClick={() => scrollSlider('right')}
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="mt-8 grid grid-cols-2 gap-6">
            <Card className="bg-gradient-to-br from-green-400 to-green-500 text-white">
              <CardContent className="p-3 text-center">
                <p className="text-xs font-semibold mb-1">Glasses Drunk</p>
                <p className="text-lg font-bold">{selectedDayData?.glassesDrunk || 0}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-yellow-400 to-yellow-500 text-white">
              <CardContent className="p-3 text-center">
                <p className="text-xs font-semibold mb-1">Glasses Pending Till Now, Today</p>
                <p className="text-lg font-bold">{selectedDayData?.glassesPending || 0}</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
      <ToastContainer />
    </div>
  )
}