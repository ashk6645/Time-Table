class TimetableManager {
    constructor() {
        this.classes = JSON.parse(localStorage.getItem('timetable-classes') || '[]');
        this.currentDate = new Date();
        this.currentView = 'daily';
        this.currentEditingClass = null;
        
        this.initializeApp();
    }

    initializeApp() {
        this.generateTimeSlots();
        this.updateDisplay();
        this.setupEventListeners();
        this.updateStatistics();
        this.startTimeUpdateInterval();
    }

    setupEventListeners() {
        document.getElementById('classForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveClass();
        });

        // Close modal when clicking outside
        document.getElementById('classModal').addEventListener('click', (e) => {
            if (e.target.id === 'classModal') {
                this.closeModal();
            }
        });

        document.getElementById('detailsModal').addEventListener('click', (e) => {
            if (e.target.id === 'detailsModal') {
                this.closeDetailsModal();
            }
        });
    }

    generateTimeSlots() {
        const timeSlots = document.getElementById('timeSlots');
        const scheduleGrid = document.getElementById('scheduleGrid');
        
        if (!timeSlots || !scheduleGrid) return;

        timeSlots.innerHTML = '';
        
        // Generate time slots from 8 AM to 8 PM
        for (let hour = 8; hour <= 20; hour++) {
            const timeSlot = document.createElement('div');
            timeSlot.className = 'time-slot';
            timeSlot.textContent = this.formatTime(hour, 0);
            timeSlots.appendChild(timeSlot);
        }
    }

    switchView(view) {
        this.currentView = view;
        
        // Update button states
        document.getElementById('dailyBtn').classList.toggle('active', view === 'daily');
        document.getElementById('weeklyBtn').classList.toggle('active', view === 'weekly');
        
        // Show/hide views
        document.getElementById('dailyView').classList.toggle('hidden', view !== 'daily');
        document.getElementById('weeklyView').classList.toggle('hidden', view !== 'weekly');
        
        this.updateDisplay();
    }

    navigateDate(direction) {
        if (this.currentView === 'daily') {
            this.currentDate.setDate(this.currentDate.getDate() + direction);
        } else {
            this.currentDate.setDate(this.currentDate.getDate() + (direction * 7));
        }
        this.updateDisplay();
    }

    goToToday() {
        this.currentDate = new Date();
        this.updateDisplay();
    }

    updateDisplay() {
        this.updateCurrentDateDisplay();
        
        if (this.currentView === 'daily') {
            this.renderDailyView();
        } else {
            this.renderWeeklyView();
        }
        
        this.updateStatistics();
    }

    updateCurrentDateDisplay() {
        const dateElement = document.getElementById('currentDate');
        if (!dateElement) return;

        if (this.currentView === 'daily') {
            dateElement.textContent = this.currentDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } else {
            const weekStart = new Date(this.currentDate);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            
            dateElement.textContent = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        }
    }

    renderDailyView() {
        const scheduleGrid = document.getElementById('scheduleGrid');
        if (!scheduleGrid) return;

        scheduleGrid.innerHTML = '';
        
        const dayName = this.currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const dayClasses = this.classes.filter(cls => cls.day === dayName);
        
        dayClasses.forEach(cls => {
            const classBlock = this.createClassBlock(cls);
            scheduleGrid.appendChild(classBlock);
        });
    }

    renderWeeklyView() {
        this.renderWeekHeader();
        this.renderWeekGrid();
    }

    renderWeekHeader() {
        const weekHeader = document.getElementById('weekHeader');
        if (!weekHeader) return;

        weekHeader.innerHTML = '<div class="week-day"></div>'; // Empty corner
        
        const weekStart = new Date(this.currentDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        
        const today = new Date();
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        for (let i = 0; i < 7; i++) {
            const day = new Date(weekStart);
            day.setDate(day.getDate() + i);
            
            const dayHeader = document.createElement('div');
            dayHeader.className = 'week-day';
            
            if (day.toDateString() === today.toDateString()) {
                dayHeader.classList.add('today');
            }
            
            dayHeader.innerHTML = `
                <div>${days[i].substring(0, 3)}</div>
                <div>${day.getDate()}</div>
            `;
            
            weekHeader.appendChild(dayHeader);
        }
    }

    renderWeekGrid() {
        const weekGrid = document.getElementById('weekGrid');
        if (!weekGrid) return;

        weekGrid.innerHTML = '';
        
        // Create time slots column
        const timeColumn = document.createElement('div');
        for (let hour = 8; hour <= 20; hour++) {
            const timeSlot = document.createElement('div');
            timeSlot.className = 'week-time-slot';
            timeSlot.textContent = this.formatTime(hour, 0);
            timeColumn.appendChild(timeSlot);
        }
        weekGrid.appendChild(timeColumn);
        
        // Create day columns
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        
        days.forEach(day => {
            const dayColumn = document.createElement('div');
            dayColumn.className = 'week-day-column';
            
            const dayClasses = this.classes.filter(cls => cls.day === day);
            
            dayClasses.forEach(cls => {
                const classBlock = this.createWeekClassBlock(cls);
                dayColumn.appendChild(classBlock);
            });
            
            weekGrid.appendChild(dayColumn);
        });
    }

    createClassBlock(cls) {
        const block = document.createElement('div');
        block.className = 'class-block';
        block.style.backgroundColor = cls.color;
        block.style.top = this.getTimePosition(cls.startTime) + 'px';
        block.style.height = this.getClassDuration(cls.startTime, cls.endTime) + 'px';
        
        block.innerHTML = `
            <div class="class-name">${cls.name}</div>
            <div class="class-info">
                ${cls.startTime} - ${cls.endTime}
                ${cls.location ? `<br>${cls.location}` : ''}
            </div>
        `;
        
        block.addEventListener('click', () => this.showClassDetails(cls));
        
        return block;
    }

    createWeekClassBlock(cls) {
        const block = document.createElement('div');
        block.className = 'week-class-block';
        block.style.backgroundColor = cls.color;
        block.style.top = this.getTimePosition(cls.startTime) + 'px';
        block.style.height = this.getClassDuration(cls.startTime, cls.endTime) + 'px';
        
        block.innerHTML = `
            <div class="class-name">${cls.name}</div>
            <div>${cls.startTime}</div>
        `;
        
        block.addEventListener('click', () => this.showClassDetails(cls));
        
        return block;
    }

    getTimePosition(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        return (hours - 8) * 60 + minutes;
    }

    getClassDuration(startTime, endTime) {
        const [startHours, startMinutes] = startTime.split(':').map(Number);
        const [endHours, endMinutes] = endTime.split(':').map(Number);
        
        const startTotalMinutes = startHours * 60 + startMinutes;
        const endTotalMinutes = endHours * 60 + endMinutes;
        
        return endTotalMinutes - startTotalMinutes;
    }

    formatTime(hour, minute) {
        const time = new Date();
        time.setHours(hour, minute);
        return time.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
    }

    openAddClassModal() {
        document.getElementById('modalTitle').textContent = 'Add New Class';
        document.getElementById('classForm').reset();
        document.getElementById('classColor').value = this.getRandomColor();
        document.getElementById('classModal').style.display = 'block';
        this.currentEditingClass = null;
    }

    closeModal() {
        document.getElementById('classModal').style.display = 'none';
        this.currentEditingClass = null;
    }

    closeDetailsModal() {
        document.getElementById('detailsModal').style.display = 'none';
        this.currentEditingClass = null;
    }

    saveClass() {
        const formData = new FormData(document.getElementById('classForm'));
        const classData = {
            id: this.currentEditingClass ? this.currentEditingClass.id : Date.now(),
            name: document.getElementById('className').value,
            instructor: document.getElementById('instructor').value,
            location: document.getElementById('location').value,
            day: document.getElementById('dayOfWeek').value,
            startTime: document.getElementById('startTime').value,
            endTime: document.getElementById('endTime').value,
            color: document.getElementById('classColor').value,
            notes: document.getElementById('notes').value
        };

        // Validate time
        if (classData.startTime >= classData.endTime) {
            this.showNotification('End time must be after start time', 'error');
            return;
        }

        // Check for conflicts
        if (this.hasTimeConflict(classData)) {
            this.showNotification('Time conflict with existing class', 'error');
            return;
        }

        if (this.currentEditingClass) {
            const index = this.classes.findIndex(cls => cls.id === this.currentEditingClass.id);
            this.classes[index] = classData;
        } else {
            this.classes.push(classData);
        }

        this.saveToLocalStorage();
        this.updateDisplay();
        this.closeModal();
        this.showNotification('Class saved successfully', 'success');
    }

    hasTimeConflict(newClass) {
        return this.classes.some(cls => {
            if (cls.id === newClass.id) return false;
            if (cls.day !== newClass.day) return false;
            
            const newStart = this.timeToMinutes(newClass.startTime);
            const newEnd = this.timeToMinutes(newClass.endTime);
            const existingStart = this.timeToMinutes(cls.startTime);
            const existingEnd = this.timeToMinutes(cls.endTime);
            
            return (newStart < existingEnd && newEnd > existingStart);
        });
    }

    timeToMinutes(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 60 + minutes;
    }

    showClassDetails(cls) {
        this.currentEditingClass = cls;
        
        const detailsContent = document.getElementById('classDetails');
        detailsContent.innerHTML = `
            <div class="detail-item">
                <div class="detail-label">Class Name</div>
                <div class="detail-value">${cls.name}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Instructor</div>
                <div class="detail-value">${cls.instructor || 'Not specified'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Location</div>
                <div class="detail-value">${cls.location || 'Not specified'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Day</div>
                <div class="detail-value">${cls.day.charAt(0).toUpperCase() + cls.day.slice(1)}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Time</div>
                <div class="detail-value">${cls.startTime} - ${cls.endTime}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Notes</div>
                <div class="detail-value">${cls.notes || 'No notes'}</div>
            </div>
        `;
        
        document.getElementById('detailsModal').style.display = 'block';
    }

    editClass() {
        if (!this.currentEditingClass) return;
        
        document.getElementById('modalTitle').textContent = 'Edit Class';
        document.getElementById('className').value = this.currentEditingClass.name;
        document.getElementById('instructor').value = this.currentEditingClass.instructor || '';
        document.getElementById('location').value = this.currentEditingClass.location || '';
        document.getElementById('dayOfWeek').value = this.currentEditingClass.day;
        document.getElementById('startTime').value = this.currentEditingClass.startTime;
        document.getElementById('endTime').value = this.currentEditingClass.endTime;
        document.getElementById('classColor').value = this.currentEditingClass.color;
        document.getElementById('notes').value = this.currentEditingClass.notes || '';
        
        this.closeDetailsModal();
        document.getElementById('classModal').style.display = 'block';
    }

    deleteClass() {
        if (!this.currentEditingClass) return;
        
        if (confirm('Are you sure you want to delete this class?')) {
            this.classes = this.classes.filter(cls => cls.id !== this.currentEditingClass.id);
            this.saveToLocalStorage();
            this.updateDisplay();
            this.closeDetailsModal();
            this.showNotification('Class deleted successfully', 'success');
        }
    }

    updateStatistics() {
        const totalClasses = this.classes.length;
        const today = new Date();
        const todayName = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const todayClasses = this.classes.filter(cls => cls.day === todayName).length;
        
        const weeklyHours = this.classes.reduce((total, cls) => {
            const duration = this.getClassDuration(cls.startTime, cls.endTime);
            return total + (duration / 60);
        }, 0);
        
        const nextClass = this.getNextClass();
        
        document.getElementById('totalClasses').textContent = totalClasses;
        document.getElementById('todayClasses').textContent = todayClasses;
        document.getElementById('weeklyHours').textContent = Math.round(weeklyHours);
        document.getElementById('nextClass').textContent = nextClass || '--';
    }

    getNextClass() {
        const now = new Date();
        const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        
        const todayClasses = this.classes
            .filter(cls => cls.day === currentDay)
            .filter(cls => this.timeToMinutes(cls.startTime) > currentTime)
            .sort((a, b) => this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime));
        
        if (todayClasses.length > 0) {
            return todayClasses[0].startTime;
        }
        
        return null;
    }

    getRandomColor() {
        const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#795548'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.getElementById('notifications').appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    saveToLocalStorage() {
        localStorage.setItem('timetable-classes', JSON.stringify(this.classes));
    }

    startTimeUpdateInterval() {
        setInterval(() => {
            this.updateStatistics();
        }, 60000); // Update every minute
    }
}

// Global functions for HTML event handlers
function switchView(view) {
    app.switchView(view);
}

function navigateDate(direction) {
    app.navigateDate(direction);
}

function goToToday() {
    app.goToToday();
}

function openAddClassModal() {
    app.openAddClassModal();
}

function closeModal() {
    app.closeModal();
}

function closeDetailsModal() {
    app.closeDetailsModal();
}

function editClass() {
    app.editClass();
}

function deleteClass() {
    app.deleteClass();
}

// Initialize the app
const app = new TimetableManager();
