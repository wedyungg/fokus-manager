<template>
  <div class="bg-background border border-border rounded-xl shadow-subtle p-3 inline-block">
    <!-- Header -->
    <div class="flex items-center justify-between mb-3">
      <button 
        @click="prevMonth" 
        type="button" 
        class="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
      >
        <IconChevronLeft class="w-4 h-4" />
      </button>
      <div class="text-sm font-semibold text-foreground px-2 py-1">
        {{ monthName }} {{ currentYear }}
      </div>
      <button 
        @click="nextMonth" 
        type="button" 
        class="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
      >
        <IconChevronRight class="w-4 h-4" />
      </button>
    </div>
    
    <!-- Calendar Grid -->
    <table class="w-full border-separate border-spacing-y-1">
      <thead>
        <tr>
          <th v-for="day in ['M', 'S', 'S', 'R', 'K', 'J', 'S']" :key="day" class="text-xs font-medium text-muted-foreground w-9 h-7 text-center">
            {{ day }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(week, weekIdx) in calendarGrid" :key="weekIdx">
          <td v-for="(day, dayIdx) in week" :key="dayIdx" class="p-0 text-center">
            <button 
              v-if="day"
              @click="selectDate(day.date)"
              type="button"
              class="relative w-9 h-9 text-sm flex items-center justify-center font-medium rounded-lg transition-colors"
              :class="[
                isSameDay(day.date, modelValue) 
                  ? 'bg-foreground text-background shadow-subtle' 
                  : 'text-foreground hover:bg-muted',
                !day.isCurrentMonth ? 'text-muted-foreground/50' : '',
                isToday(day.date) && !isSameDay(day.date, modelValue) 
                  ? 'bg-muted/50' : ''
              ]"
            >
              {{ day.date.getDate() }}
              <!-- Dot for today -->
              <span v-if="isToday(day.date) && !isSameDay(day.date, modelValue)" class="absolute bottom-1 w-1 h-1 bg-foreground rounded-full"></span>
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ChevronLeft as IconChevronLeft, ChevronRight as IconChevronRight } from 'lucide-vue-next'

const props = defineProps({
  modelValue: {
    type: Date,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'select'])

const displayDate = ref(props.modelValue ? new Date(props.modelValue) : new Date())

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    displayDate.value = new Date(newVal)
  }
})

const currentMonth = computed(() => displayDate.value.getMonth())
const currentYear = computed(() => displayDate.value.getFullYear())

const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const monthName = computed(() => monthNames[currentMonth.value])

const prevMonth = () => {
  displayDate.value = new Date(currentYear.value, currentMonth.value - 1, 1)
}

const nextMonth = () => {
  displayDate.value = new Date(currentYear.value, currentMonth.value + 1, 1)
}

const selectDate = (date) => {
  emit('update:modelValue', date)
  emit('select', date)
}

const isSameDay = (d1, d2) => {
  if (!d1 || !d2) return false
  return d1.getDate() === d2.getDate() && 
         d1.getMonth() === d2.getMonth() && 
         d1.getFullYear() === d2.getFullYear()
}

const isToday = (date) => {
  return isSameDay(date, new Date())
}

const calendarGrid = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value
  
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  
  const daysInMonth = lastDayOfMonth.getDate()
  // 0 = Sunday, 1 = Monday...
  const startingDayOfWeek = firstDayOfMonth.getDay() 
  
  const grid = []
  let currentWeek = []
  
  // Previous month days
  const prevMonthLastDay = new Date(year, month, 0).getDate()
  for (let i = 0; i < startingDayOfWeek; i++) {
    const day = prevMonthLastDay - startingDayOfWeek + i + 1
    currentWeek.push({
      date: new Date(year, month - 1, day),
      isCurrentMonth: false
    })
  }
  
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    currentWeek.push({
      date: new Date(year, month, i),
      isCurrentMonth: true
    })
    
    if (currentWeek.length === 7) {
      grid.push(currentWeek)
      currentWeek = []
    }
  }
  
  // Next month days
  if (currentWeek.length > 0) {
    let nextMonthDay = 1
    while (currentWeek.length < 7) {
      currentWeek.push({
        date: new Date(year, month + 1, nextMonthDay++),
        isCurrentMonth: false
      })
    }
    grid.push(currentWeek)
  }
  
  return grid
})
</script>
