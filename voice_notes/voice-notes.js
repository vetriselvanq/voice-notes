document.addEventListener('DOMContentLoaded', () => {
    // Check if browser supports speech recognition
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('Your browser does not support speech recognition. Try Chrome or Edge.');
        document.getElementById('recordButton').disabled = true;
        return;
    }

    // Elements
    const recordButton = document.getElementById('recordButton');
    const recordingStatus = document.getElementById('recordingStatus');
    const interimTranscript = document.getElementById('interimTranscript');
    const noteContent = document.getElementById('noteContent');
    const noteTitle = document.getElementById('noteTitle');
    const saveNoteButton = document.getElementById('saveNote');
    const notesList = document.getElementById('notesList');
    const searchInput = document.getElementById('searchInput');

    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US'; // Set language

    // Variables
    let isRecording = false;
    let notes = JSON.parse(localStorage.getItem('voiceNotes')) || [];

    // Event listeners
    recordButton.addEventListener('click', toggleRecording);
    saveNoteButton.addEventListener('click', saveNote);
    searchInput.addEventListener('input', searchNotes);

    // Initial render
    renderNotes();

    // Speech recognition events
    recognition.onstart = () => {
        isRecording = true;
        recordButton.classList.add('recording');
        recordButton.textContent = 'Stop Recording';
        recordingStatus.textContent = 'Listening...';
    };

    recognition.onend = () => {
        isRecording = false;
        recordButton.classList.remove('recording');
        recordButton.textContent = 'Start Recording';
        recordingStatus.textContent = 'Ready to record';
        interimTranscript.textContent = '';
    };

    recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimText = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
            } else {
                interimText += transcript;
            }
        }

        if (finalTranscript) {
            noteContent.value += finalTranscript;
        }
        
        interimTranscript.textContent = interimText;
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        recordingStatus.textContent = `Error: ${event.error}`;
        stopRecording();
    };

    // Functions
    function toggleRecording() {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }

    function startRecording() {
        try {
            recognition.start();
        } catch (error) {
            console.error('Error starting recognition:', error);
        }
    }

    function stopRecording() {
        try {
            recognition.stop();
        } catch (error) {
            console.error('Error stopping recognition:', error);
        }
    }

    function saveNote() {
        const title = noteTitle.value.trim() || `Note ${new Date().toLocaleString()}`;
        const content = noteContent.value.trim();
        
        if (!content) {
            alert('Please add some content to your note');
            return;
        }

        const newNote = {
            id: Date.now().toString(),
            title,
            content,
            createdAt: new Date().toISOString()
        };

        notes.unshift(newNote); // Add to beginning of array
        saveNotesToLocalStorage();
        renderNotes();

        // Clear inputs
        noteTitle.value = '';
        noteContent.value = '';
        
        alert('Note saved successfully!');
    }

    function renderNotes() {
        notesList.innerHTML = '';
        
        if (notes.length === 0) {
            notesList.innerHTML = '<p class="no-notes">No notes yet. Start recording to create one!</p>';
            return;
        }

        notes.forEach(note => {
            const noteElement = createNoteElement(note);
            notesList.appendChild(noteElement);
        });
    }

    function createNoteElement(note) {
        const li = document.createElement('li');
        li.className = 'note-item';
        li.dataset.id = note.id;

        const date = new Date(note.createdAt);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        
        // Preview is first 100 characters of content
        const preview = note.content.length > 100 ? 
            note.content.substring(0, 100) + '...' : 
            note.content;

        li.innerHTML = `
            <h3>${note.title}</h3>
            <div class="note-date">${formattedDate}</div>
            <div class="note-preview">${preview}</div>
            <div class="note-actions">
                <button class="edit-btn" data-id="${note.id}">Edit</button>
                <button class="delete-btn" data-id="${note.id}">Delete</button>
            </div>
        `;

        // Add click event to edit note
        li.querySelector('.edit-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            editNote(note.id);
        });

        // Add click event to delete note
        li.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteNote(note.id);
        });

        // Add click event to view note
        li.addEventListener('click', () => {
            viewNote(note);
        });

        return li;
    }

    function viewNote(note) {
        noteTitle.value = note.title;
        noteContent.value = note.content;
    }

    function editNote(noteId) {
        const note = notes.find(n => n.id === noteId);
        if (note) {
            noteTitle.value = note.title;
            noteContent.value = note.content;
            
            // Scroll to editor
            document.querySelector('.note-editor').scrollIntoView({ behavior: 'smooth' });
            
            // Remove the note to avoid duplicates when saving
            deleteNote(noteId, false); // false means don't ask for confirmation
        }
    }

    function deleteNote(noteId, askConfirmation = true) {
        if (askConfirmation && !confirm('Are you sure you want to delete this note?')) {
            return;
        }
        
        notes = notes.filter(note => note.id !== noteId);
        saveNotesToLocalStorage();
        renderNotes();
    }

    function searchNotes() {
        const searchTerm = searchInput.value.toLowerCase();
        
        if (!searchTerm) {
            renderNotes();
            return;
        }
        
        const filteredNotes = notes.filter(note => 
            note.title.toLowerCase().includes(searchTerm) || 
            note.content.toLowerCase().includes(searchTerm)
        );
        
        renderFilteredNotes(filteredNotes);
    }

    function renderFilteredNotes(filteredNotes) {
        notesList.innerHTML = '';
        
        if (filteredNotes.length === 0) {
            notesList.innerHTML = '<p class="no-notes">No matching notes found.</p>';
            return;
        }
        
        filteredNotes.forEach(note => {
            const noteElement = createNoteElement(note);
            notesList.appendChild(noteElement);
        });
    }

    function saveNotesToLocalStorage() {
        localStorage.setItem('voiceNotes', JSON.stringify(notes));
    }
});
