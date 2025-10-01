document.addEventListener('DOMContentLoaded', function() {
    // Check if this is a loaded session and auto-populate data
    const isLoadedSession = document.getElementById('isLoadedSession');
    const sessionId = document.getElementById('sessionId');
    
    if (isLoadedSession && isLoadedSession.value === 'true' && sessionId) {
        console.log('🔄 Detected loaded session, auto-populating data...');
        autoPopulateLoadedSession(sessionId.value);
    }
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    
    // Form and step navigation elements
    const form = document.getElementById('reportForm');
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const nextBtn = document.getElementById('nextBtn');
    const backBtn = document.getElementById('backBtn');
    const alertMessageStep1 = document.getElementById('alertMessageStep1');
    const alertMessageStep2 = document.getElementById('alertMessageStep2');
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    // Image preview elements
    const solutionImage = document.getElementById('solutionImage');
    const imagePreview = document.getElementById('imagePreview');
    const modalImagePreview = document.getElementById('modalImagePreview');
    const aiAnalysisContainer = document.getElementById('aiAnalysisContainer');
    const aiAnalysisText = document.getElementById('aiAnalysisText');
    const modalAnalysisText = document.getElementById('modalAnalysisText');
    const aiAnalysisInput = document.getElementById('aiAnalysis');
    const useAnalysisBtn = document.getElementById('useAnalysisBtn');
    const visionBtn = document.getElementById('visionBtn');
    const aiBtn = document.getElementById('aiBtn');
    const enhanceBtn = document.getElementById('enhanceBtn');
    
    // Original file input placeholder
    const originalPlaceholder = solutionImage ? solutionImage.placeholder || "No file chosen" : "No file chosen";
    
    // Initialize bootstrap modals
    const imageModal = new bootstrap.Modal(document.getElementById('imageModal'));
    const aiAnalysisModal = new bootstrap.Modal(document.getElementById('aiAnalysisModal'));
    
    // Step navigation
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            // Validate step 1 fields
            if (validateStep1()) {
                // Gather basic information
                const sessionId = document.getElementById('sessionId').value;
                const date = document.getElementById('date').value;
                const title = document.getElementById('title').value;
                const recipient = document.getElementById('recipient').value;
                const engineer = document.getElementById('engineer').value;
                
                // Save basic information to session
                fetch('/save-basic-info', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        sessionId: sessionId,
                        date: date,
                        title: title,
                        recipient: recipient,
                        engineer: engineer
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        console.log('Basic information saved successfully');
                        // Proceed to step 2
                step1.classList.remove('active');
                step2.classList.add('active');
                // Reinitialize feather icons when showing step 2
                if (typeof feather !== 'undefined') {
                    feather.replace();
                }
                    } else {
                        console.error('Error saving basic information:', data.message);
                        showAlert('Failed to save information: ' + data.message, 'danger', 1);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    showAlert('Error saving information', 'danger', 1);
                });
            }
        });
    }
    
    // Add Enter key functionality to Step 1 form fields
    const step1Fields = ['date', 'title', 'recipient', 'engineer'];
    step1Fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('keypress', function(event) {
                if (event.key === 'Enter') {
                    event.preventDefault(); // Prevent form submission
                    if (nextBtn) {
                        nextBtn.click(); // Trigger the next button click
                    }
                }
            });
        }
    });
    
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            step2.classList.remove('active');
            step1.classList.add('active');
            // Reinitialize feather icons when showing step 1
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        });
    }
    
    // Next to Step 2.1 button handler (navigate without structuring)
    const nextToStep2_1Btn = document.getElementById('nextToStep2_1Btn');
    if (nextToStep2_1Btn) {
        nextToStep2_1Btn.addEventListener('click', function() {
            // Get session ID and form data
            const sessionId = document.getElementById('sessionId').value;
            const imageLink = modalImagePreview && modalImagePreview.src && modalImagePreview.src !== window.location.href ? modalImagePreview.src : '';
            const explanation = document.getElementById('solutionExplanation').value;
            
            // Save additional info to session
            fetch('/save-additional-info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId: sessionId,
                    imageLink: imageLink,
                    explanation: explanation
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('Step 2 data saved successfully');
                    // Navigate to Step 2.1
                    showStep('step2_1');
                    showAlert('Moved to structured solution. You can manually edit fields or use AI structuring.', 'info', 3);
                } else {
                    console.error('Error saving Step 2 data:', data.message);
                    showAlert('Failed to save data: ' + data.message, 'danger', 2);
                }
            })
            .catch(error => {
                console.error('Error saving Step 2 data:', error);
                showAlert('Error saving data', 'danger', 2);
            });
        });
    }
    
    // Enhance button click handler (placeholder for future functionality)
    if (enhanceBtn) {
        enhanceBtn.addEventListener('click', function() {
            const solutionExplanation = document.getElementById('solutionExplanation');
            const explanationText = solutionExplanation.value.trim();
            
            if (!explanationText) {
                showAlert('Please enter some text to enhance', 'warning', 2);
                return;
            }
            
            // Show loading state
            enhanceBtn.disabled = true;
            enhanceBtn.innerHTML = '<i data-feather="loader" class="loader"></i> Enhancing...';
            if (typeof feather !== 'undefined') {
                feather.replace();
                document.querySelector('.loader').classList.add('rotating');
            }
            
            // Send to server for enhancement
            fetch('/enhance-explanation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    explanation: explanationText
                })
            })
            .then(response => response.json())
            .then(data => {
                // Reset button state
                enhanceBtn.disabled = false;
                enhanceBtn.innerHTML = '<i data-feather="zap"></i> Enhance explanation';
                if (typeof feather !== 'undefined') {
                    feather.replace();
                }
                
                if (data.success) {
                    // Update the text area with enhanced text
                    solutionExplanation.value = data.enhanced_explanation;
                    showAlert('Explanation enhanced successfully', 'success', 2);
                } else {
                    showAlert('Error: ' + data.message, 'danger', 2);
                }
            })
            .catch(error => {
                // Reset button state
                enhanceBtn.disabled = false;
                enhanceBtn.innerHTML = '<i data-feather="zap"></i> Enhance explanation';
                if (typeof feather !== 'undefined') {
                    feather.replace();
                }
                
                console.error('Error enhancing explanation:', error);
                showAlert('Error enhancing explanation', 'danger', 2);
            });
        });
    }
    
    // Image preview and vision button functionality
    if (solutionImage) {
        solutionImage.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                // Restore original appearance before setting the file name
                resetFileInputAppearance();
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    // Store the image data in hidden preview element
                    imagePreview.src = e.target.result;
                    
                    // Also set the modal image src
                    if (modalImagePreview) {
                        modalImagePreview.src = e.target.result;
                    }
                    
                    // Enable the vision button and change its color
                    if (visionBtn) {
                        visionBtn.classList.remove('disabled', 'icon-btn');
                        visionBtn.classList.add('btn-primary', 'image-uploaded');
                    }
                    
                    // Show the re-analyze button
                    const reanalyzeBtn = document.getElementById('reanalyzeBtn');
                    if (reanalyzeBtn) {
                        reanalyzeBtn.classList.remove('d-none');
                        // Re-initialize feather icons for the newly visible button
                        if (typeof feather !== 'undefined') {
                            feather.replace();
                        }
                    }
                    
                    // Clear previous analysis
                    clearAnalysis();
                    
                    // Update View Image button state
                    updateImageButtonsState();
                    
                    // Automatically trigger analysis when image is uploaded
                    analyzeUploadedImage(file);
                }
                reader.readAsDataURL(file);
            } else {
                // Clear and disable elements if no file is selected
                imagePreview.src = '#';
                if (modalImagePreview) {
                    modalImagePreview.src = '#';
                }
                
                // Reset the file input appearance
                resetFileInputAppearance();
                
                // Disable and reset the vision button
                if (visionBtn) {
                    visionBtn.classList.add('disabled', 'icon-btn');
                    visionBtn.classList.remove('btn-primary', 'image-uploaded');
                }
                
                // Hide the re-analyze button
                const reanalyzeBtn = document.getElementById('reanalyzeBtn');
                if (reanalyzeBtn) {
                    reanalyzeBtn.classList.add('d-none');
                }
                
                // Clear and disable AI analysis elements
                clearAnalysis();
                
                // Update View Image button state
                updateImageButtonsState();
                
                if (aiBtn) {
                    aiBtn.classList.add('disabled', 'icon-btn');
                    aiBtn.classList.remove('btn-success');
                }
            }
        });
    }
    
    // Helper function to reset file input appearance
    function resetFileInputAppearance() {
        if (solutionImage) {
            solutionImage.classList.remove('file-input-analyzing', 'file-input-analyzed', 'file-input-error');
            solutionImage.removeAttribute('data-status');
        }
    }
    
    // Helper function to clear analysis data
    function clearAnalysis() {
        if (aiAnalysisText) {
            aiAnalysisText.textContent = '';
        }
        if (modalAnalysisText) {
            modalAnalysisText.textContent = '';
        }
        if (aiAnalysisInput) {
            aiAnalysisInput.value = '';
        }
    }
    
    // Vision button click handler
    if (visionBtn) {
        visionBtn.addEventListener('click', function() {
            if (!this.classList.contains('disabled') && imageModal) {
                imageModal.show();
            }
        });
    }
    
    // Re-analyze button click handler
    const reanalyzeBtn = document.getElementById('reanalyzeBtn');
    if (reanalyzeBtn) {
        reanalyzeBtn.addEventListener('click', function() {
            const file = solutionImage ? solutionImage.files[0] : null;
            if (file) {
                // Clear previous analysis
                clearAnalysis();
                
                // Reset AI button state
                if (aiBtn) {
                    aiBtn.classList.add('disabled', 'icon-btn');
                    aiBtn.classList.remove('btn-success');
                }
                
                // Re-analyze the same image
                analyzeUploadedImage(file);
            } else {
                showAlert('No image available to re-analyze', 'warning', 2);
            }
        });
    }
    
    // Function to analyze uploaded image
    function analyzeUploadedImage(file) {
        if (!file) {
            setFileInputState('error', 'No file to analyze');
            return;
        }
        
        // Update file input to show analyzing state
        setFileInputState('analyzing', 'Analyzing image...');
        
        const formData = new FormData();
        formData.append('image', file);
        
        console.log('Automatically sending image for analysis...');
        
        fetch('/analyze-image', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            console.log('Analysis complete:', data);
            
            if (data.success) {
                // Store analysis in hidden elements
                const analysisText = data.analysis;
                
                if (aiAnalysisText) {
                    aiAnalysisText.textContent = analysisText;
                }
                
                if (modalAnalysisText) {
                    modalAnalysisText.textContent = analysisText;
                }
                
                if (aiAnalysisInput) {
                    aiAnalysisInput.value = analysisText;
                }
                
                // Update file input to show analyzed state
                setFileInputState('analyzed', 'Analysis complete');
                
                // Enable the AI button and change its color
                if (aiBtn) {
                    aiBtn.classList.remove('disabled', 'icon-btn');
                    aiBtn.classList.add('btn-success');
                }
            } else {
                // Update file input to show error state
                setFileInputState('error', 'Analysis failed: ' + (data.message || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error during image analysis:', error);
            
            // Update file input to show error state
            setFileInputState('error', 'Analysis error');
        });
    }
    
    // Set the file input state and appearance
    function setFileInputState(state, message) {
        if (!solutionImage) return;
        
        // Remove any existing status classes
        resetFileInputAppearance();
        
        // Add appropriate class based on state
        switch (state) {
            case 'analyzing':
                solutionImage.classList.add('file-input-analyzing');
                break;
            case 'analyzed':
                solutionImage.classList.add('file-input-analyzed');
                break;
            case 'error':
                solutionImage.classList.add('file-input-error');
                // Only show alerts for errors, not for status updates
                showAlert(message, 'danger');
                break;
        }
        
        // Set data attribute for status (can be used for other styling if needed)
        solutionImage.setAttribute('data-status', state);
        
        // No longer showing alerts for status updates - only for errors
    }
    
    // AI button click handler - now opens the modal
    if (aiBtn) {
        aiBtn.addEventListener('click', function() {
            if (!this.classList.contains('disabled') && aiAnalysisModal) {
                // Make sure modal text has the latest analysis
                if (modalAnalysisText && aiAnalysisText) {
                    modalAnalysisText.textContent = aiAnalysisText.textContent;
                }
                
                // Show the modal
                aiAnalysisModal.show();
                
                // Initialize feather icons in the modal
                if (typeof feather !== 'undefined') {
                    feather.replace();
                }
            }
        });
    }
    
    // Use Analysis button handler
    if (useAnalysisBtn) {
        useAnalysisBtn.addEventListener('click', function() {
            const solutionExplanation = document.getElementById('solutionExplanation');
            
            if (solutionExplanation && aiAnalysisText) {
                const analysis = aiAnalysisText.textContent;
                
                if (analysis) {
                    // Set the solution explanation to the analysis text
                    solutionExplanation.value = analysis;
                    showAlert('Analysis copied to explanation', 'success', 2);
                    
                    // Close the modal
                    if (aiAnalysisModal) {
                        aiAnalysisModal.hide();
                    }
                }
            }
        });
    }
    
    // Form submission handler
    if (form) {
        form.addEventListener('submit', function(event) {
            // Prevent the default form submission for validation
            event.preventDefault();
            
            // Validate form
            if (!validateForm()) {
                return;
            }
            
            // Show loading overlay
            loadingOverlay.classList.remove('d-none');
            
            // Submit the form for PDF generation
            this.submit();
            
            // Hide loading overlay after a timeout (fallback)
            setTimeout(() => {
                loadingOverlay.classList.add('d-none');
            }, 10000);
        });
    }
    
    // Validate step 1 fields
    function validateStep1() {
        const title = document.getElementById('title').value.trim();
        const recipient = document.getElementById('recipient').value.trim();
        const engineer = document.getElementById('engineer').value.trim();
        
        if (!title || !recipient || !engineer) {
            showAlert('Please fill in all required fields in Step 1', 'danger', 1);
            return false;
        }
        
        return true;
    }
    
    // Validate all form fields before submission
    function validateForm() {
        // Step 1 validation
        if (!validateStep1()) {
            step2.classList.remove('active');
            step1.classList.add('active');
            return false;
        }
        
        return true;
    }
    
    // Function to show alert messages
    function showAlert(message, type = 'info', step = null) {
        let alertElement;
        
        // Determine which alert element to use based on the step
        if (step === 1) {
            alertElement = alertMessageStep1;
        } else if (step === 2) {
            alertElement = alertMessageStep2;
        } else if (step === 3) {
            alertElement = document.getElementById('alertMessageStep2_1');
        } else {
            // If no step is specified, show the alert in the current active step
            if (step1.classList.contains('active')) {
                alertElement = alertMessageStep1;
            } else if (step2.classList.contains('active')) {
                alertElement = alertMessageStep2;
            } else {
                alertElement = document.getElementById('alertMessageStep2_1');
            }
        }
        
        if (alertElement) {
            alertElement.textContent = message;
            alertElement.className = `alert alert-${type}`;
            alertElement.classList.remove('d-none');
            
            // Scroll to the alert
            alertElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Hide alert after 5 seconds
            setTimeout(() => {
                alertElement.classList.add('d-none');
            }, 5000);
        }
    }
    
    // Initialize Feather icons if script is loaded
    if (typeof feather !== 'undefined') {
        feather.replace();
    }

    // Initialize custom difficulty slider appearance
    const initializeDifficultySlider = () => {
        const difficultySlider = document.getElementById('difficultySlider');
        const difficultyFill = document.getElementById('difficultyFill');
        const difficultyRedOverlay = document.getElementById('difficultyRedOverlay');
        
        if (difficultySlider && difficultyFill && difficultyRedOverlay) {
            const value = difficultySlider.value;
            const percentage = (value / 100) * 100;
            difficultyFill.style.width = percentage + '%';
            difficultyRedOverlay.style.width = percentage + '%';
            
            // Calculate red opacity based on difficulty (0% = 0 opacity, 100% = 1 opacity)
            const redOpacity = value / 100;
            difficultyRedOverlay.style.opacity = redOpacity;
        }
    };
    
    // Initialize slider when DOM is ready
    initializeDifficultySlider();

    // Structure Solution functionality
    document.getElementById('structureSolutionBtn').addEventListener('click', function() {
        // Check if image has been analyzed
        const sessionId = document.getElementById('sessionId').value;
        const aiAnalysis = document.getElementById('aiAnalysis').value;
        const solutionExplanation = document.getElementById('solutionExplanation').value;
        
        // Validation
        if (!solutionExplanation.trim()) {
            showAlert('Please provide a solution explanation before structuring.', 'danger', 2);
            return;
        }
        
        // Get the image link from the image preview or ImgBB if available
        let imageLink = '';
        if (modalImagePreview && modalImagePreview.src && modalImagePreview.src !== window.location.href) {
            imageLink = modalImagePreview.src;
        }
        
        // First, save the additional information
        fetch('/save-additional-info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sessionId: sessionId,
                imageLink: imageLink,
                explanation: solutionExplanation
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Additional information saved successfully');
                
                // Now proceed with the structure solution
                // Show the breathing overlay
                const breathingOverlay = document.getElementById('breathingOverlay');
                const overlayMessage = breathingOverlay.querySelector('p');
                
                // Set the original message for structuring
                if (overlayMessage) {
                    overlayMessage.textContent = "Structuring your solution...";
                }
                
                breathingOverlay.classList.add('active');
                
                // Disable the button while processing
                this.disabled = true;
                document.getElementById('backBtn').disabled = true;
                
                // Make request to structure the solution
                fetch('/structure-solution', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        sessionId: sessionId,
                        aiAnalysis: aiAnalysis,
                        solutionExplanation: solutionExplanation
                    })
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    // Hide the breathing overlay
                    breathingOverlay.classList.remove('active');
                    
                    // Re-enable buttons
                    document.getElementById('structureSolutionBtn').disabled = false;
                    document.getElementById('backBtn').disabled = false;
                    
                    if (data.success) {
                        // Populate structured data fields
                        document.getElementById('structuredTitle').value = data.title;
                        document.getElementById('structuredSteps').value = data.steps;
                        document.getElementById('structuredApproach').value = data.approach;
                        document.getElementById('difficultySlider').value = data.difficulty;
                        document.getElementById('difficultyValue').textContent = data.difficulty;
                        
                        // Update render boxes
                        updateRenderBox('structuredTitle');
                        updateRenderBox('structuredSteps');
                        updateRenderBox('structuredApproach');
                        
                        // Update difficulty slider appearance
                        const difficultyFill = document.getElementById('difficultyFill');
                        const difficultyRedOverlay = document.getElementById('difficultyRedOverlay');
                        if (difficultyFill && difficultyRedOverlay) {
                            const percentage = data.difficulty;
                            difficultyFill.style.width = percentage + '%';
                            difficultyRedOverlay.style.width = percentage + '%';
                            difficultyRedOverlay.style.opacity = percentage / 100;
                        }
                        
                        // Update Per Node Stack button to green (stack has been generated)
                        const perNodeStackBtn = document.getElementById('perNodeStackBtn');
                        if (perNodeStackBtn) {
                            perNodeStackBtn.classList.remove('btn-light');
                            perNodeStackBtn.classList.add('btn-success');
                        }
                        
                        showAlert('Solution has been structured successfully with AI-generated stack analysis!', 'success', 2);
                        setTimeout(function() {
                            showStep('step2_1');
                        }, 1500);
                    } else {
                        showAlert('Error: ' + data.message, 'danger', 3);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    
                    // Hide the breathing overlay
                    breathingOverlay.classList.remove('active');
                    
                    // Re-enable buttons
                    document.getElementById('structureSolutionBtn').disabled = false;
                    document.getElementById('backBtn').disabled = false;
                    
                    showAlert('Error structuring solution: ' + error.message, 'danger', 2);
                });
            } else {
                console.error('Error saving additional information:', data.message);
                showAlert('Failed to save information: ' + data.message, 'danger', 2);
            }
        })
        .catch(error => {
            console.error('Error saving additional information:', error);
            showAlert('Error saving information', 'danger', 2);
        });
    });
    
    // Back button for Step 2.1
    document.getElementById('backToStep2Btn').addEventListener('click', function() {
        showStep('step2');
    });
    
    // Update difficulty percentage display when slider changes
    document.getElementById('difficultySlider').addEventListener('input', function() {
        const value = this.value;
        document.getElementById('difficultyValue').textContent = value;
        
        // Update custom slider appearance
        const difficultyFill = document.getElementById('difficultyFill');
        const difficultyRedOverlay = document.getElementById('difficultyRedOverlay');
        
        if (difficultyFill && difficultyRedOverlay) {
            const percentage = (value / 100) * 100;
            difficultyFill.style.width = percentage + '%';
            difficultyRedOverlay.style.width = percentage + '%';
            
            // Calculate red opacity based on difficulty (0% = 0 opacity, 100% = 1 opacity)
            const redOpacity = value / 100;
            difficultyRedOverlay.style.opacity = redOpacity;
        }
    });
    
    // Submit handler for structured form
    document.getElementById('generatePdfFromStructuredBtn').addEventListener('click', function(event) {
        // Prevent default form submission
        event.preventDefault();
        
        // Get all form values
        const sessionId = document.getElementById('sessionId').value;
        const structuredTitle = document.getElementById('structuredTitle').value;
        const structuredSteps = document.getElementById('structuredSteps').value;
        const structuredApproach = document.getElementById('structuredApproach').value;
        const difficultyValue = document.getElementById('difficultySlider').value;
        const aiAnalysis = document.getElementById('aiAnalysis').value;
        const solutionExplanation = document.getElementById('solutionExplanation').value;
        
        // Get the selected layout
        let selectedLayoutValue = 1;
        document.querySelectorAll('.layout-btn').forEach(btn => {
            if (btn.classList.contains('selected')) {
                selectedLayoutValue = btn.getAttribute('data-layout');
            }
        });
        
        // Update solution data in session
        fetch('/update-solution-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sessionId: sessionId,
                title: structuredTitle,
                steps: structuredSteps,
                approach: structuredApproach,
                difficulty: difficultyValue,
                layout: selectedLayoutValue,
                aiAnalysis: aiAnalysis,
                solutionExplanation: solutionExplanation
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Solution data updated successfully');
                // Continue with normal form submission
                document.getElementById('reportForm').submit();
            } else {
                console.error('Error updating solution data:', data.message);
                showAlert('Failed to update solution data: ' + data.message, 'danger', 3);
            }
        })
        .catch(error => {
            console.error('Error updating solution data:', error);
            showAlert('Error updating solution data', 'danger', 3);
        });
    });
    
    // Next Solution button handler 
    document.getElementById('nextSolutionBtn').addEventListener('click', function() {
        console.log('Next Solution button clicked - starting multi-solution workflow');
        
        // Get all form values
        const sessionId = document.getElementById('sessionId').value;
        const structuredTitle = document.getElementById('structuredTitle').value;
        const structuredSteps = document.getElementById('structuredSteps').value;
        const structuredApproach = document.getElementById('structuredApproach').value;
        const difficultyValue = document.getElementById('difficultySlider').value;
        const aiAnalysis = document.getElementById('aiAnalysis').value;
        const solutionExplanation = document.getElementById('solutionExplanation').value;
        
        // Get the selected layout
        let selectedLayoutValue = 1;
        document.querySelectorAll('.layout-btn').forEach(btn => {
            if (btn.classList.contains('selected')) {
                selectedLayoutValue = btn.getAttribute('data-layout');
            }
        });
        
        console.log('Saving current solution data before creating next solution');
        
        // First, update current solution data in session
        fetch('/update-solution-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sessionId: sessionId,
                title: structuredTitle,
                steps: structuredSteps,
                approach: structuredApproach,
                difficulty: difficultyValue,
                layout: selectedLayoutValue,
                aiAnalysis: aiAnalysis,
                solutionExplanation: solutionExplanation
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Current solution data saved successfully, now creating next solution');
                
                // Now create the next solution
                return fetch('/next-solution', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        sessionId: sessionId
                    })
                });
            } else {
                throw new Error('Failed to save current solution data: ' + data.message);
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log(`Next solution created successfully: Solution ${data.current_solution} of ${data.solution_count}`);
                
                // Reset Step 2 form for new solution
                resetStep2Forms();
                
                // Update solution counter display if it exists
                updateSolutionCounter(data.current_solution, data.solution_count);
                
                // Navigate back to Step 2 for new solution content
                showStep('step2');
                
                // Show success message
                showAlert(`Started Solution ${data.current_solution}. Previous solution saved.`, 'success', 2);
            } else {
                console.error('Error creating next solution:', data.message);
                showAlert('Failed to create next solution: ' + data.message, 'danger', 3);
            }
        })
        .catch(error => {
            console.error('Error in next solution workflow:', error);
            showAlert('Error creating next solution: ' + error.message, 'danger', 3);
        });
    });
    
    // Initialize view/edit modals for Step 2.1
    const analysisModal = new bootstrap.Modal(document.getElementById('analysisModal'));
    const explanationModal = new bootstrap.Modal(document.getElementById('explanationModal'));
    
    // View Analysis button handler
    document.getElementById('viewAnalysisBtn').addEventListener('click', function() {
        // Get current analysis value from hidden input
        const aiAnalysis = document.getElementById('aiAnalysis').value;
        
        // Populate the modal textarea
        document.getElementById('modalAnalysisEditor').value = aiAnalysis;
        
        // Show the modal
        analysisModal.show();
        
        // Initialize feather icons in the modal
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    });
    
    // Update Analysis button handler
    document.getElementById('updateAnalysisBtn').addEventListener('click', function() {
        // Get the edited value from the modal
        const editedAnalysis = document.getElementById('modalAnalysisEditor').value;
        
        // Update the hidden input
        document.getElementById('aiAnalysis').value = editedAnalysis;
        
        // Close the modal
        analysisModal.hide();
        
        // Show a success message
        showAlert('AI analysis updated successfully', 'success', 3);
    });
    
    // View Explanation button handler
    document.getElementById('viewExplanationBtn').addEventListener('click', function() {
        // Get current explanation value from textarea
        const solutionExplanation = document.getElementById('solutionExplanation').value;
        
        // Populate the modal textarea
        document.getElementById('modalExplanationEditor').value = solutionExplanation;
        
        // Show the modal
        explanationModal.show();
        
        // Initialize feather icons in the modal
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    });
    
    // Update Explanation button handler
    document.getElementById('updateExplanationBtn').addEventListener('click', function() {
        // Get the edited value from the modal
        const editedExplanation = document.getElementById('modalExplanationEditor').value;
        
        // Update the form textarea
        document.getElementById('solutionExplanation').value = editedExplanation;
        
        // Close the modal
        explanationModal.hide();
        
        // Show a success message
        showAlert('Solution explanation updated successfully', 'success', 3);
    });
    
    // View Image button handler
    document.getElementById('viewImageBtn').addEventListener('click', function() {
        // Check if there's an image available
        const modalImagePreview = document.getElementById('modalImagePreview');
        
        if (modalImagePreview && modalImagePreview.src && modalImagePreview.src !== window.location.href) {
            // Show the image modal (reuse the existing modal from Step 2)
            const imageModal = new bootstrap.Modal(document.getElementById('imageModal'));
            imageModal.show();
            
            // Initialize feather icons in the modal
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        } else {
            // No image available
            showAlert('No solution image available. Please upload an image in Step 2.', 'warning', 3);
        }
    });
    
    // Image Actions button handler
    document.getElementById('imageActionsBtn').addEventListener('click', function() {
        // Show the image actions modal
        const imageActionsModal = new bootstrap.Modal(document.getElementById('imageActionsModal'));
        imageActionsModal.show();
        
        // Initialize feather icons in the modal
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    });
    
    // Initialize Image Actions modal
    const imageActionsModal = new bootstrap.Modal(document.getElementById('imageActionsModal'));
    
    // Modal Reanalyze button handler
    document.getElementById('modalReanalyzeBtn').addEventListener('click', function() {
        const solutionImage = document.getElementById('solutionImage');
        const file = solutionImage ? solutionImage.files[0] : null;
        
        if (file) {
            // Close the modal first
            imageActionsModal.hide();
            
            // Clear previous analysis
            clearAnalysis();
            
            // Reset AI button state
            const aiBtn = document.getElementById('aiBtn');
            if (aiBtn) {
                aiBtn.classList.add('disabled', 'icon-btn');
                aiBtn.classList.remove('btn-success');
            }
            
            // Re-analyze the same image
            analyzeUploadedImage(file);
            
            // Update View Image button state
            updateImageButtonsState();
            
            showAlert('Re-analyzing image...', 'info', 3);
        } else {
            showAlert('No image available to re-analyze. Please upload an image first.', 'warning', 3);
        }
    });
    
    // Modal Upload button handler
    document.getElementById('modalUploadBtn').addEventListener('click', function() {
        // Trigger the hidden file input
        const modalFileInput = document.getElementById('modalFileInput');
        modalFileInput.click();
    });
    
    // Modal file input change handler
    document.getElementById('modalFileInput').addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            // Close the modal first
            imageActionsModal.hide();
            
            // Update the main file input with the selected file
            const solutionImage = document.getElementById('solutionImage');
            if (solutionImage) {
                // Create a new FileList with the selected file
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                solutionImage.files = dataTransfer.files;
                
                // Trigger the change event on the main file input to process the image
                const event = new Event('change', { bubbles: true });
                solutionImage.dispatchEvent(event);
                
                showAlert('New image uploaded successfully', 'success', 3);
            }
        }
        
        // Reset the modal file input
        this.value = '';
    });
    
    // Brain button handler (placeholder for future functionality)
    document.getElementById('brainBtn').addEventListener('click', function() {
        // Get the current AI analysis and solution explanation
        const sessionId = document.getElementById('sessionId').value;
        const aiAnalysis = document.getElementById('aiAnalysis').value;
        const solutionExplanation = document.getElementById('solutionExplanation').value;
        
        // Validation
        if (!solutionExplanation.trim()) {
            showAlert('Solution explanation is required to restructure the solution.', 'danger', 3);
            return;
        }
        
        // Show the breathing overlay
        const breathingOverlay = document.getElementById('breathingOverlay');
        const overlayMessage = breathingOverlay.querySelector('p');
        
        // Change the message for restructuring
        if (overlayMessage) {
            overlayMessage.textContent = "Restructuring your solution...";
        }
        
        breathingOverlay.classList.add('active');
        
        // Disable the button while processing
        this.disabled = true;
        document.getElementById('backToStep2Btn').disabled = true;
        document.getElementById('generatePdfFromStructuredBtn').disabled = true;
        document.getElementById('viewAnalysisBtn').disabled = true;
        document.getElementById('viewExplanationBtn').disabled = true;
        
        // Make request to structure the solution
        fetch('/structure-solution', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sessionId: sessionId,
                aiAnalysis: aiAnalysis,
                solutionExplanation: solutionExplanation
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Hide the breathing overlay
            breathingOverlay.classList.remove('active');
            
            // Re-enable buttons
            this.disabled = false;
            document.getElementById('backToStep2Btn').disabled = false;
            document.getElementById('generatePdfFromStructuredBtn').disabled = false;
            document.getElementById('viewAnalysisBtn').disabled = false;
            document.getElementById('viewExplanationBtn').disabled = false;
            
            if (data.success) {
                // Populate structured data fields
                document.getElementById('structuredTitle').value = data.title;
                document.getElementById('structuredSteps').value = data.steps;
                document.getElementById('structuredApproach').value = data.approach;
                document.getElementById('difficultySlider').value = data.difficulty;
                document.getElementById('difficultyValue').textContent = data.difficulty;
                
                // Update render boxes
                updateRenderBox('structuredTitle');
                updateRenderBox('structuredSteps');
                updateRenderBox('structuredApproach');
                
                // Update difficulty slider appearance
                const difficultyFill = document.getElementById('difficultyFill');
                const difficultyRedOverlay = document.getElementById('difficultyRedOverlay');
                if (difficultyFill && difficultyRedOverlay) {
                    const percentage = data.difficulty;
                    difficultyFill.style.width = percentage + '%';
                    difficultyRedOverlay.style.width = percentage + '%';
                    difficultyRedOverlay.style.opacity = percentage / 100;
                }
                
                // Update Per Node Stack button to green (stack has been generated)
                const perNodeStackBtn = document.getElementById('perNodeStackBtn');
                if (perNodeStackBtn) {
                    perNodeStackBtn.classList.remove('btn-light');
                    perNodeStackBtn.classList.add('btn-success');
                }
                
                showAlert('Solution has been structured successfully with AI-generated stack analysis!', 'success', 2);
            } else {
                showAlert('Failed to restructure solution: ' + data.message, 'danger', 3);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            
            // Hide the breathing overlay
            breathingOverlay.classList.remove('active');
            
            // Re-enable buttons
            this.disabled = false;
            document.getElementById('backToStep2Btn').disabled = false;
            document.getElementById('generatePdfFromStructuredBtn').disabled = false;
            document.getElementById('viewAnalysisBtn').disabled = false;
            document.getElementById('viewExplanationBtn').disabled = false;
            
            showAlert('Error restructuring solution: ' + error.message, 'danger', 3);
        });
    });
    
    // Per Node Stack button handler
    document.getElementById('perNodeStackBtn').addEventListener('click', function() {
        // Initialize the stack modal
        const stackModal = new bootstrap.Modal(document.getElementById('stackModal'));
        const modalStackContent = document.getElementById('modalStackContent');
        
        // Get current session data to retrieve stack information
        const sessionId = document.getElementById('sessionId').value;
        
        // Fetch current solution data to get the stack field
        fetch('/get-session-info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sessionId: sessionId
            })
        })
        .then(response => response.json())
        .then(sessionInfo => {
            if (sessionInfo.success) {
                const currentSolution = sessionInfo.current_solution;
                
                // Get the specific solution data
                return fetch('/get-solution-data', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        sessionId: sessionId,
                        solutionNumber: currentSolution
                    })
                });
            } else {
                throw new Error('Failed to get session info');
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.data && data.data.structure) {
                const stackContent = data.data.structure.stack || '';
                
                if (stackContent.trim()) {
                    modalStackContent.innerHTML = stackContent;
                    // Make the button green since there's content
                    document.getElementById('perNodeStackBtn').classList.remove('btn-light');
                    document.getElementById('perNodeStackBtn').classList.add('btn-success');
                } else {
                    modalStackContent.innerHTML = '<em class="text-muted">No stack information available yet...</em>';
                    // Keep the button white since there's no content
                    document.getElementById('perNodeStackBtn').classList.remove('btn-success');
                    document.getElementById('perNodeStackBtn').classList.add('btn-light');
                }
            } else {
                modalStackContent.innerHTML = '<em class="text-muted">No stack information available yet...</em>';
                // Keep the button white since there's no content
                document.getElementById('perNodeStackBtn').classList.remove('btn-success');
                document.getElementById('perNodeStackBtn').classList.add('btn-light');
            }
            
            // Show the modal
            stackModal.show();
            
            // Re-initialize feather icons in the modal
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        })
        .catch(error => {
            console.error('Error fetching stack data:', error);
            modalStackContent.innerHTML = '<em class="text-muted text-danger">Error loading stack information</em>';
            stackModal.show();
        });
    });
    
    // Generate Stack button handler
    document.getElementById('generateStackBtn').addEventListener('click', function() {
        const generateBtn = this;
        const sessionId = document.getElementById('sessionId').value;
        const modalStackContent = document.getElementById('modalStackContent');
        
        // Get the current solution data
        const aiAnalysis = document.getElementById('aiAnalysis').value;
        const solutionExplanation = document.getElementById('solutionExplanation').value;
        const modalImagePreview = document.getElementById('modalImagePreview');
        const imageLink = modalImagePreview && modalImagePreview.src && modalImagePreview.src !== window.location.href ? modalImagePreview.src : '';
        
        // Validation
        if (!solutionExplanation.trim()) {
            showAlert('Solution explanation is required to generate stack analysis.', 'warning', 3);
            return;
        }
        
        // Show loading state
        generateBtn.disabled = true;
        const originalContent = generateBtn.innerHTML;
        generateBtn.innerHTML = '<i data-feather="loader" class="rotating me-1"></i> Generating...';
        modalStackContent.innerHTML = '<div class="text-center p-4"><i data-feather="loader" class="rotating me-2"></i>Analyzing nodes and generating stack recommendations...</div>';
        
        // Re-initialize feather icons
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
        
        // Send request to generate stack analysis
        fetch('/generate-stack-analysis', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sessionId: sessionId,
                aiAnalysis: aiAnalysis,
                solutionExplanation: solutionExplanation,
                imageLink: imageLink
            })
        })
        .then(response => response.json())
        .then(data => {
            // Reset button state
            generateBtn.disabled = false;
            generateBtn.innerHTML = originalContent;
            
            if (data.success) {
                // Update the modal content with the generated stack analysis
                modalStackContent.innerHTML = data.stack_analysis;
                
                // Change the Per Node Stack button to green to indicate it has content
                const perNodeStackBtn = document.getElementById('perNodeStackBtn');
                if (perNodeStackBtn) {
                    perNodeStackBtn.classList.remove('btn-light');
                    perNodeStackBtn.classList.add('btn-success');
                }
                
                showAlert('Stack analysis generated successfully!', 'success', 3);
            } else {
                modalStackContent.innerHTML = '<em class="text-muted text-danger">Error generating stack analysis: ' + (data.message || 'Unknown error') + '</em>';
                showAlert('Error generating stack analysis: ' + (data.message || 'Unknown error'), 'danger', 3);
            }
            
            // Re-initialize feather icons
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        })
        .catch(error => {
            console.error('Error generating stack analysis:', error);
            
            // Reset button state
            generateBtn.disabled = false;
            generateBtn.innerHTML = originalContent;
            modalStackContent.innerHTML = '<em class="text-muted text-danger">Network error occurred while generating stack analysis</em>';
            showAlert('Network error generating stack analysis', 'danger', 3);
            
            // Re-initialize feather icons
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        });
    });
    
    // Preview PDF button handler
    document.getElementById('previewPdfBtn').addEventListener('click', function() {
        const previewBtn = this;
        const sessionId = document.getElementById('sessionId').value;
        
        // Get all form values to ensure they're saved
        const structuredTitle = document.getElementById('structuredTitle').value;
        const structuredSteps = document.getElementById('structuredSteps').value;
        const structuredApproach = document.getElementById('structuredApproach').value;
        const difficultyValue = document.getElementById('difficultySlider').value;
        const aiAnalysis = document.getElementById('aiAnalysis').value;
        const solutionExplanation = document.getElementById('solutionExplanation').value;
        
        // Get the selected layout
        let selectedLayoutValue = 1;
        document.querySelectorAll('.layout-btn').forEach(btn => {
            if (btn.classList.contains('selected')) {
                selectedLayoutValue = btn.getAttribute('data-layout');
            }
        });
        
        // Get image link
        const modalImagePreview = document.getElementById('modalImagePreview');
        const imageLink = modalImagePreview && modalImagePreview.src && modalImagePreview.src !== window.location.href ? modalImagePreview.src : '';
        
        // Show loading state
        previewBtn.disabled = true;
        const originalContent = previewBtn.innerHTML;
        previewBtn.innerHTML = '<i data-feather="loader" class="rotating me-1"></i> Generating...';
        
        // Re-initialize feather icons
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
        
        // First, save current solution data
        fetch('/save-additional-info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sessionId: sessionId,
                imageLink: imageLink,
                explanation: solutionExplanation
            })
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                throw new Error(data.message || 'Failed to save additional info');
            }
            
            // Then save solution data
            return fetch('/update-solution-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId: sessionId,
                    title: structuredTitle,
                    steps: structuredSteps,
                    approach: structuredApproach,
                    difficulty: difficultyValue,
                    layout: selectedLayoutValue,
                    aiAnalysis: aiAnalysis,
                    solutionExplanation: solutionExplanation
                })
            });
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                throw new Error(data.message || 'Failed to save solution data');
            }
            
            // Now generate and preview the PDF
            const previewUrl = `/preview-pdf?sessionId=${encodeURIComponent(sessionId)}`;
            window.open(previewUrl, '_blank');
            
            // Reset button state
            previewBtn.disabled = false;
            previewBtn.innerHTML = originalContent;
            
            // Re-initialize feather icons
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
            
            showAlert('PDF preview opened in new tab', 'success', 3);
        })
        .catch(error => {
            console.error('Error previewing PDF:', error);
            
            // Reset button state
            previewBtn.disabled = false;
            previewBtn.innerHTML = originalContent;
            
            // Re-initialize feather icons
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
            
            showAlert('Error generating PDF preview: ' + error.message, 'danger', 3);
        });
    });
    
    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    });
    
    // Layout buttons toggle functionality
    const layoutButtons = document.querySelectorAll('.layout-btn');
    let selectedLayout = null;
    
    // Set the first layout as default selected
    if (layoutButtons.length > 0) {
        layoutButtons[0].classList.add('selected');
        selectedLayout = layoutButtons[0].getAttribute('data-layout');
    }
    
    // Add click event to each layout button
    layoutButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove selected class from all buttons
            layoutButtons.forEach(btn => btn.classList.remove('selected'));
            
            // Add selected class to clicked button
            this.classList.add('selected');
            
            // Store selected layout value
            selectedLayout = this.getAttribute('data-layout');
            
            // Get session ID
            const sessionId = document.getElementById('sessionId').value;
            
            // Save layout selection to session
            fetch('/save-layout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId: sessionId,
                    layout: selectedLayout
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('Layout saved successfully:', selectedLayout);
                } else {
                    console.error('Error saving layout:', data.message);
                }
            })
            .catch(error => {
                console.error('Error saving layout:', error);
            });
        });
    });

    // AI Enhancement button click handler
    document.getElementById('aiEnhanceBtn').addEventListener('click', function() {
        // Get the current values
        const structuredTitle = document.getElementById('structuredTitle').value.trim();
        const structuredSteps = document.getElementById('structuredSteps').value.trim();
        const structuredApproach = document.getElementById('structuredApproach').value.trim();
        
        // Validation
        if (!structuredTitle && !structuredSteps && !structuredApproach) {
            showAlert('Please add some content to enhance first.', 'warning', 3);
            return;
        }
        
        // Show loading state
        this.disabled = true;
        const originalContent = this.innerHTML;
        this.innerHTML = `
            <div class="ai-enhance-content">
                <i data-feather="loader" class="rotating"></i>
                <span>Enhancing...</span>
                <div class="ai-enhance-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
            <div class="ai-enhance-glisten"></div>
        `;
        
        // Re-initialize feather icons for the loader
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
        
        // Send to server for AI enhancement
        fetch('/enhance-structured-content', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: structuredTitle,
                steps: structuredSteps,
                approach: structuredApproach
            })
        })
        .then(response => response.json())
        .then(data => {
            // Reset button state
            this.disabled = false;
            this.innerHTML = originalContent;
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
            
            if (data.success) {
                // Update the form fields with enhanced content
                if (data.enhanced_title && structuredTitle) {
                    document.getElementById('structuredTitle').value = data.enhanced_title;
                    updateRenderBox('structuredTitle');
                }
                if (data.enhanced_steps && structuredSteps) {
                    document.getElementById('structuredSteps').value = data.enhanced_steps;
                    updateRenderBox('structuredSteps');
                }
                if (data.enhanced_approach && structuredApproach) {
                    document.getElementById('structuredApproach').value = data.enhanced_approach;
                    updateRenderBox('structuredApproach');
                }
                
                showAlert('Content enhanced successfully with AI formatting!', 'success', 3);
            } else {
                showAlert('Error: ' + (data.message || 'Enhancement failed'), 'danger', 3);
            }
        })
        .catch(error => {
            // Reset button state
            this.disabled = false;
            this.innerHTML = originalContent;
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
            
            console.error('Error enhancing content:', error);
            showAlert('Error enhancing content', 'danger', 3);
        });
    });

    // Section title toggle functionality for render/edit modes
    document.querySelectorAll('.section-title-toggle').forEach(label => {
        label.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const textbox = document.getElementById(targetId);
            const renderBox = document.getElementById(targetId + '-render');
            
            if (textbox && renderBox) {
                if (textbox.style.display === 'none') {
                    // Switch to edit mode
                    textbox.style.display = 'block';
                    renderBox.style.display = 'none';
                    textbox.focus();
                } else {
                    // Switch to render mode
                    textbox.style.display = 'none';
                    renderBox.style.display = 'block';
                    updateRenderBox(targetId);
                }
            }
        });
    });
    
    // Add event listeners to update render boxes when textboxes change
    ['structuredTitle', 'structuredSteps', 'structuredApproach'].forEach(fieldId => {
        const textbox = document.getElementById(fieldId);
        if (textbox) {
            textbox.addEventListener('input', function() {
                updateRenderBox(fieldId);
            });
            
            textbox.addEventListener('blur', function() {
                // Auto-switch back to render mode when losing focus
                setTimeout(() => {
                    if (document.activeElement !== textbox) {
                        textbox.style.display = 'none';
                        document.getElementById(fieldId + '-render').style.display = 'block';
                        updateRenderBox(fieldId);
                    }
                }, 100);
            });
        }
    });
    
    // Initialize render boxes on page load
    ['structuredTitle', 'structuredSteps', 'structuredApproach'].forEach(fieldId => {
        updateRenderBox(fieldId);
    });

    // ===== SOLUTION TAB MANAGEMENT =====
    
    // Track current tab state
    let currentTab = 'basic';
    let isTabSwitching = false;
    
    // Initialize tabs on page load
    initializeSolutionTabs();
    
    function initializeSolutionTabs() {
        const sessionId = document.getElementById('sessionId').value;
        
        if (sessionId) {
            fetch('/get-session-info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId: sessionId
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    generateSolutionTabs(data.current_solution, data.total_solutions);
                    // Set current tab based on session state
                    if (typeof data.current_solution === 'number') {
                        currentTab = data.current_solution.toString();
                    } else {
                        currentTab = 'basic';
                    }
                    updateActiveTab();
                } else {
                    console.error('Failed to get session info:', data.message);
                }
            })
            .catch(error => {
                console.error('Error initializing tabs:', error);
            });
        }
    }
    
    function generateSolutionTabs(currentSolution, totalSolutions) {
        const container = document.getElementById('solutionTabsContainer');
        if (!container) return;
        
        // Clear existing solution tabs
        container.innerHTML = '';
        
        // Only generate solution tabs if there are actually solutions to show
        if (totalSolutions > 0) {
        // Generate solution tabs (1, 2, 3, etc.)
        for (let i = 1; i <= totalSolutions; i++) {
            const tabBtn = document.createElement('button');
            tabBtn.className = 'tab-btn solution-tab';
            tabBtn.setAttribute('data-target', i.toString());
            tabBtn.innerHTML = `
                <i data-feather="layers" class="tab-icon"></i>
                ${i}
            `;
            
            // Add click handler
            tabBtn.addEventListener('click', function() {
                switchToSolution(i.toString());
            });
            
            container.appendChild(tabBtn);
        }
        
        // Re-initialize feather icons
        if (typeof feather !== 'undefined') {
            feather.replace();
            }
        }
    }
    
    function updateActiveTab() {
        // Remove active class from all tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to current tab
        if (currentTab === 'basic') {
            document.getElementById('basicTab').classList.add('active');
        } else {
            const targetTab = document.querySelector(`[data-target="${currentTab}"]`);
            if (targetTab) {
                targetTab.classList.add('active');
            }
        }
    }
    
    function switchToSolution(targetSolution) {
        if (isTabSwitching || targetSolution === currentTab) return;
        
        // Validate current solution fields before switching (only if we're leaving a solution tab)
        if (currentTab !== 'basic' && !validateCurrentSolutionFields()) {
            return; // Don't proceed with switch if validation fails
        }
        
        isTabSwitching = true;
        console.log(`Switching from ${currentTab} to ${targetSolution}`);
        
        // Auto-save current data before switching
        autoSaveCurrentData()
            .then(() => {
                // Switch to target solution
                return switchSolution(targetSolution);
            })
            .then(() => {
                // Update UI state
                currentTab = targetSolution;
                updateActiveTab();
                
                // Show appropriate step
                if (targetSolution === 'basic') {
                    showStep('step1');
                } else {
                    showStep('step2_1'); // Go directly to structured view for solutions
                }
                
                isTabSwitching = false;
            })
            .catch(error => {
                console.error('Error switching solution:', error);
                showAlert('Error switching solution: ' + error.message, 'danger');
                isTabSwitching = false;
            });
    }
    
    function validateCurrentSolutionFields() {
        // Get the values of the three required fields
        const structuredTitle = document.getElementById('structuredTitle').value.trim();
        const structuredSteps = document.getElementById('structuredSteps').value.trim();
        const structuredApproach = document.getElementById('structuredApproach').value.trim();
        
        // Check if any field is empty
        const missingFields = [];
        if (!structuredTitle) missingFields.push('Solution Title');
        if (!structuredSteps) missingFields.push('Solution Steps');
        if (!structuredApproach) missingFields.push('Technical Approach');
        
        if (missingFields.length > 0) {
            const fieldList = missingFields.join(', ');
            const message = `Please complete the following required fields before switching solutions: ${fieldList}`;
            showAlert(message, 'warning', 3);
            
            // Scroll to the first empty field and highlight it
            if (!structuredTitle) {
                highlightEmptyField('structuredTitle');
            } else if (!structuredSteps) {
                highlightEmptyField('structuredSteps');
            } else if (!structuredApproach) {
                highlightEmptyField('structuredApproach');
            }
            
            return false;
        }
        
        return true;
    }
    
    function highlightEmptyField(fieldId) {
        const field = document.getElementById(fieldId);
        const renderBox = document.getElementById(fieldId + '-render');
        
        if (field && renderBox) {
            // Switch to edit mode to show the empty field
            field.style.display = 'block';
            renderBox.style.display = 'none';
            
            // Focus on the field
            field.focus();
            
            // Add a temporary highlight effect
            field.style.borderColor = '#dc3545';
            field.style.boxShadow = '0 0 0 0.2rem rgba(220, 53, 69, 0.25)';
            
            // Remove highlight after 3 seconds
            setTimeout(() => {
                field.style.borderColor = '';
                field.style.boxShadow = '';
            }, 3000);
            
            // Scroll to the field
            field.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    function autoSaveCurrentData() {
        const sessionId = document.getElementById('sessionId').value;
        
        if (currentTab === 'basic') {
            // Save basic information
            const date = document.getElementById('date').value;
            const title = document.getElementById('title').value;
            const recipient = document.getElementById('recipient').value;
            const engineer = document.getElementById('engineer').value;
            
            return fetch('/save-basic-info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId: sessionId,
                    date: date,
                    title: title,
                    recipient: recipient,
                    engineer: engineer
                })
            })
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    throw new Error(data.message || 'Failed to save basic info');
                }
                console.log('Basic info auto-saved');
            });
        } else {
            // Save solution data
            const structuredTitle = document.getElementById('structuredTitle').value;
            const structuredSteps = document.getElementById('structuredSteps').value;
            const structuredApproach = document.getElementById('structuredApproach').value;
            const difficultyValue = document.getElementById('difficultySlider').value;
            const aiAnalysis = document.getElementById('aiAnalysis').value;
            const solutionExplanation = document.getElementById('solutionExplanation').value;
            
            // Get selected layout
            let selectedLayoutValue = 1;
            document.querySelectorAll('.layout-btn').forEach(btn => {
                if (btn.classList.contains('selected')) {
                    selectedLayoutValue = btn.getAttribute('data-layout');
                }
            });
            
            // Get image link
            const modalImagePreview = document.getElementById('modalImagePreview');
            const imageLink = modalImagePreview && modalImagePreview.src && modalImagePreview.src !== window.location.href ? modalImagePreview.src : '';
            
            // Save additional info first
            return fetch('/save-additional-info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId: sessionId,
                    imageLink: imageLink,
                    explanation: solutionExplanation
                })
            })
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    throw new Error(data.message || 'Failed to save additional info');
                }
                
                // Then save solution data
                return fetch('/update-solution-data', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        sessionId: sessionId,
                        title: structuredTitle,
                        steps: structuredSteps,
                        approach: structuredApproach,
                        difficulty: difficultyValue,
                        layout: selectedLayoutValue,
                        aiAnalysis: aiAnalysis,
                        solutionExplanation: solutionExplanation
                    })
                });
            })
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    throw new Error(data.message || 'Failed to save solution data');
                }
                console.log('Solution data auto-saved');
            });
        }
    }
    
    function switchSolution(targetSolution) {
        const sessionId = document.getElementById('sessionId').value;
        
        return fetch('/switch-solution', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sessionId: sessionId,
                targetSolution: targetSolution
            })
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                throw new Error(data.message || 'Failed to switch solution');
            }
            
            // Load data into forms
            if (data.target === 'basic') {
                loadBasicData(data.data);
            } else {
                loadSolutionData(data.data);
                // Update solution counter
                updateSolutionCounter(data.solution_number, getTotalSolutions());
            }
            
            console.log(`Successfully switched to ${targetSolution}`);
        });
    }
    
    function loadBasicData(basicData) {
        // Populate basic form fields without triggering events
        if (basicData.date) document.getElementById('date').value = basicData.date;
        if (basicData.title) document.getElementById('title').value = basicData.title;
        if (basicData.prepared_for) document.getElementById('recipient').value = basicData.prepared_for;
        if (basicData.engineer) document.getElementById('engineer').value = basicData.engineer;
    }
    
    function loadSolutionData(solutionData) {
        // Load additional data
        const additional = solutionData.additional || {};
        if (additional.explanation) {
            document.getElementById('solutionExplanation').value = additional.explanation;
        }
        
        // Load image if available
        if (additional.image_link) {
            const modalImagePreview = document.getElementById('modalImagePreview');
            const imagePreview = document.getElementById('imagePreview');
            if (modalImagePreview) modalImagePreview.src = additional.image_link;
            if (imagePreview) imagePreview.src = additional.image_link;
            
            // Update button states
            updateImageButtonsState();
        }
        
        // Load variables data
        const variables = solutionData.variables || {};
        if (variables.ai_analysis) {
            document.getElementById('aiAnalysis').value = variables.ai_analysis;
            
            // Update AI analysis display elements
            const aiAnalysisText = document.getElementById('aiAnalysisText');
            const modalAnalysisText = document.getElementById('modalAnalysisText');
            if (aiAnalysisText) aiAnalysisText.textContent = variables.ai_analysis;
            if (modalAnalysisText) modalAnalysisText.textContent = variables.ai_analysis;
        }
        
        // Load structure data
        const structure = solutionData.structure || {};
        if (structure.title) document.getElementById('structuredTitle').value = structure.title;
        if (structure.steps) document.getElementById('structuredSteps').value = structure.steps;
        if (structure.approach) document.getElementById('structuredApproach').value = structure.approach;
        
        if (structure.difficulty !== undefined) {
            const difficultySlider = document.getElementById('difficultySlider');
            const difficultyValue = document.getElementById('difficultyValue');
            if (difficultySlider && difficultyValue) {
                difficultySlider.value = structure.difficulty;
                difficultyValue.textContent = structure.difficulty;
                
                // Update slider appearance
                const difficultyFill = document.getElementById('difficultyFill');
                const difficultyRedOverlay = document.getElementById('difficultyRedOverlay');
                if (difficultyFill && difficultyRedOverlay) {
                    const percentage = structure.difficulty;
                    difficultyFill.style.width = percentage + '%';
                    difficultyRedOverlay.style.width = percentage + '%';
                    difficultyRedOverlay.style.opacity = percentage / 100;
                }
            }
        }
        
        // Update layout selection
        if (structure.layout) {
            document.querySelectorAll('.layout-btn').forEach(btn => {
                btn.classList.remove('selected');
                if (btn.getAttribute('data-layout') === structure.layout.toString()) {
                    btn.classList.add('selected');
                }
            });
        }
        
        // Update render boxes
        updateRenderBox('structuredTitle');
        updateRenderBox('structuredSteps');
        updateRenderBox('structuredApproach');
        
        // Update Per Node Stack button color based on stack content
        const perNodeStackBtn = document.getElementById('perNodeStackBtn');
        if (perNodeStackBtn && structure.stack && structure.stack.trim()) {
            perNodeStackBtn.classList.remove('btn-light');
            perNodeStackBtn.classList.add('btn-success');
        } else if (perNodeStackBtn) {
            perNodeStackBtn.classList.remove('btn-success');
            perNodeStackBtn.classList.add('btn-light');
        }
    }
    
    function getTotalSolutions() {
        return document.querySelectorAll('.solution-tab').length;
    }
    
    // Basic tab click handler
    document.getElementById('basicTab').addEventListener('click', function() {
        switchToSolution('basic');
    });
    
    // Add solution tab click handler
    document.getElementById('addSolutionTab').addEventListener('click', function() {
        if (isTabSwitching) return;
        
        // Auto-save current data first
        autoSaveCurrentData()
            .then(() => {
                // Create new solution using existing functionality
                const sessionId = document.getElementById('sessionId').value;
                return fetch('/next-solution', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        sessionId: sessionId
                    })
                });
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Regenerate tabs
                    generateSolutionTabs(data.current_solution, data.solution_count);
                    
                    // Switch to new solution
                    currentTab = data.current_solution.toString();
                    updateActiveTab();
                    
                    // Reset forms for new solution
                    resetStep2Forms();
                    
                    // Show Step 2 for new solution
                    showStep('step2');
                    
                    showAlert(`Started Solution ${data.current_solution}`, 'success');
                } else {
                    showAlert('Failed to create new solution: ' + data.message, 'danger');
                }
            })
            .catch(error => {
                console.error('Error creating new solution:', error);
                showAlert('Error creating new solution', 'danger');
            });
    });

    // Helper function to update View Image and Image Actions button states
    function updateImageButtonsState() {
        const viewImageBtn = document.getElementById('viewImageBtn');
        const imageActionsBtn = document.getElementById('imageActionsBtn');
        const modalImagePreview = document.getElementById('modalImagePreview');
        
        const hasImage = modalImagePreview && modalImagePreview.src && modalImagePreview.src !== window.location.href;
        
        if (viewImageBtn) {
            if (hasImage) {
                // Image is available - enable button and make it primary with white style
                viewImageBtn.classList.remove('disabled', 'icon-btn');
                viewImageBtn.classList.add('btn-primary', 'image-uploaded');
            } else {
                // No image available - disable button and reset to default style
                viewImageBtn.classList.add('disabled', 'icon-btn');
                viewImageBtn.classList.remove('btn-primary', 'image-uploaded');
            }
        }
        
        if (imageActionsBtn) {
            if (hasImage) {
                // Image is available - enable button and make it primary
                imageActionsBtn.classList.remove('disabled', 'icon-btn');
                imageActionsBtn.classList.add('btn-primary');
            } else {
                // No image available - disable button and reset to default style
                imageActionsBtn.classList.add('disabled', 'icon-btn');
                imageActionsBtn.classList.remove('btn-primary');
            }
        }
    }
    
    // Keep the old function name for backward compatibility
    function updateViewImageButtonState() {
        updateImageButtonsState();
    }

    // Delete Solution Button
    document.getElementById('deleteSolutionBtn').addEventListener('click', function() {
        deleteSolution();
    });

    function deleteSolution() {
        // Can't delete if we're on the basic tab
        if (currentTab === 'basic') {
            showAlert('Cannot delete the basic information tab.', 'warning', 3);
            return;
        }
        
        // Get current solution number
        const currentSolutionNum = parseInt(currentTab);
        const totalSolutions = getTotalSolutions();
        
        // Can't delete if it's the only solution
        if (totalSolutions <= 1) {
            showAlert('Cannot delete the last remaining solution. At least one solution must exist.', 'warning', 3);
            return;
        }
        
        // Confirm deletion
        if (!confirm(`Are you sure you want to delete Solution ${currentSolutionNum}? This action cannot be undone.`)) {
            return;
        }
        
        const sessionId = document.getElementById('sessionId').value;
        
        fetch('/delete-solution', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sessionId: sessionId,
                solutionNumber: currentSolutionNum
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert(`Solution ${currentSolutionNum} has been deleted.`, 'success', 3);
                
                // Switch to a different solution
                let targetSolution;
                if (currentSolutionNum > 1) {
                    // Switch to the previous solution
                    targetSolution = currentSolutionNum - 1;
                } else {
                    // If we deleted solution 1, switch to what is now solution 1
                    targetSolution = 1;
                }
                
                // Update the current tab to avoid validation
                currentTab = 'basic';
                
                // Switch to the target solution
                switchToSolution(targetSolution.toString());
                
                // Regenerate tabs to reflect the new state using the updated count
                setTimeout(() => {
                    const newSolutionCount = data.solution_count || data.new_total;
                    generateSolutionTabs(targetSolution, newSolutionCount);
                    updateSolutionCounter(targetSolution, newSolutionCount);
                    updateActiveTab(); // Ensure the correct tab is highlighted
                }, 100);
                
            } else {
                showAlert('Error deleting solution: ' + data.message, 'danger', 3);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('Error deleting solution: ' + error.message, 'danger', 3);
        });
    }

    // Save Solution Button
    document.getElementById('saveSolutionBtn').addEventListener('click', function() {
        saveSessionToDatabase();
    });

    function saveSessionToDatabase() {
        const sessionId = document.getElementById('sessionId').value;
        
        if (!sessionId) {
            showAlert('No session ID found. Please refresh the page.', 'danger', 3);
            return;
        }
        
        // Show loading state
        const saveBtn = document.getElementById('saveSolutionBtn');
        const originalText = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i data-feather="loader" class="rotating" style="width: 16px; height: 16px; margin-right: 4px;"></i>Updating & Saving...';
        
        // Replace feather icons
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
        
        // First, auto-save current form data to ensure we have the latest version
        autoSaveCurrentData()
            .then(() => {
                // Now fetch the updated session object and log it
                return fetch('/get-session-info', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        sessionId: sessionId
                    })
                });
            })
            .then(response => response.json())
            .then(sessionInfo => {
                if (sessionInfo.success) {
                    console.log('📁 Session Object Ready for Database Save:');
                    console.log('Session ID:', sessionId);
                    console.log('Current Solution:', sessionInfo.current_solution);
                    console.log('Total Solutions:', sessionInfo.total_solutions);
                    console.log('🔄 Auto-save completed - sending to database...');
                }
                
                // Now save to database
                return fetch('/save-session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        sessionId: sessionId
                    })
                });
            })
            .then(response => response.json())
            .then(data => {
                // Reset button state
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
                
                // Replace feather icons
                if (typeof feather !== 'undefined') {
                    feather.replace();
                }
                
                if (data.success) {
                    showAlert(`Session saved successfully to database row ${data.row_id}!`, 'success', 3);
                    console.log('✅ Session saved to database successfully!');
                    console.log(`Database Row ID: ${data.row_id}`);
                } else {
                    showAlert('Error saving session: ' + data.message, 'danger', 3);
                    console.error('❌ Save error:', data.message);
                }
            })
            .catch(error => {
                // Reset button state
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
                
                // Replace feather icons
                if (typeof feather !== 'undefined') {
                    feather.replace();
                }
                
                console.error('❌ Error in save process:', error);
                showAlert('Error saving session: ' + error.message, 'danger', 3);
            });
    }

    // Auto-populate loaded session data
    function autoPopulateLoadedSession(sessionId) {
        console.log('📊 Auto-populating loaded session:', sessionId);
        
        // Get session info first to understand the structure
        fetch('/get-session-info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sessionId: sessionId
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('📋 Session info loaded:', data);
                
                // Generate solution tabs based on the loaded session
                generateSolutionTabs(data.current_solution, data.total_solutions);
                
                // Set current tab based on session state
                if (typeof data.current_solution === 'number') {
                    currentTab = data.current_solution.toString();
                } else {
                    currentTab = 'basic';
                }
                
                // Load basic information
                loadBasicInfoFromSession(sessionId);
                
                // Load all solution data
                for (let i = 1; i <= data.total_solutions; i++) {
                    loadSolutionFromSession(sessionId, i);
                }
                
                // Update active tab and show appropriate step
                updateActiveTab();
                
                // Determine which step to show based on session completeness
                determineStepToShow(sessionId);
                
                console.log('✅ Loaded session auto-population complete');
                
            } else {
                console.error('Failed to get session info:', data.message);
                showAlert('Error loading session data: ' + data.message, 'danger');
            }
        })
        .catch(error => {
            console.error('Error auto-populating session:', error);
            showAlert('Error loading session data', 'danger');
        });
    }
    
    // Load basic information from session
    function loadBasicInfoFromSession(sessionId) {
        fetch('/get-solution-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sessionId: sessionId,
                solutionNumber: 'basic'
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.data) {
                console.log('📝 Loading basic info:', data.data);
                loadBasicData(data.data);
            }
        })
        .catch(error => {
            console.error('Error loading basic info:', error);
        });
    }
    
    // Load solution data from session
    function loadSolutionFromSession(sessionId, solutionNumber) {
        fetch('/get-solution-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sessionId: sessionId,
                solutionNumber: solutionNumber
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.data) {
                console.log(`🔧 Loading solution ${solutionNumber}:`, data.data);
                
                // If this is the current solution, load it into the forms
                if (currentTab === solutionNumber.toString()) {
                    loadSolutionData(data.data);
                }
            }
        })
        .catch(error => {
            console.error(`Error loading solution ${solutionNumber}:`, error);
        });
    }
    
    // Determine which step to show based on session completeness
    function determineStepToShow(sessionId) {
        const basicData = {
            date: document.getElementById('date').value,
            title: document.getElementById('title').value,
            recipient: document.getElementById('recipient').value,
            engineer: document.getElementById('engineer').value
        };
        
        // Check if basic info is filled
        const basicComplete = basicData.date && basicData.title && basicData.recipient && basicData.engineer;
        
        if (!basicComplete) {
            // Basic info incomplete, show step 1
            showStep('step1');
            currentTab = 'basic';
        } else {
            // Basic info complete, check solutions
            const currentSolutionComplete = checkCurrentSolutionCompleteness();
            
            if (currentSolutionComplete) {
                // Show structured solution step
                showStep('step2_1');
            } else {
                // Show additional content step
                showStep('step2');
            }
        }
        
        updateActiveTab();
    }
    
    // Check if current solution has enough data for structured view
    function checkCurrentSolutionCompleteness() {
        const explanation = document.getElementById('solutionExplanation').value;
        const title = document.getElementById('structuredTitle').value;
        const steps = document.getElementById('structuredSteps').value;
        const approach = document.getElementById('structuredApproach').value;
        
        return explanation && (title || steps || approach);
    }
});

// Function to update render box with HTML content (moved to global scope)
function updateRenderBox(fieldId) {
    const textbox = document.getElementById(fieldId);
    const renderBox = document.getElementById(fieldId + '-render');
    
    if (textbox && renderBox) {
        const content = textbox.value.trim();
        if (content) {
            renderBox.innerHTML = content;
        } else {
            renderBox.innerHTML = '<em class="text-muted">No content yet...</em>';
        }
    }
}

// Helper function to show steps (used by new functionality and existing code)
function showStep(stepId) {
    // Hide all steps
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
    });
    
    // Show the requested step
    document.getElementById(stepId).classList.add('active');
    
    // If navigating to Step 2.1, update View Image button state
    if (stepId === 'step2_1') {
        updateViewImageButtonState();
    }
    
    // If navigating to Step 2 or Step 2.1, fetch and update solution counter
    if (stepId === 'step2' || stepId === 'step2_1') {
        const sessionId = document.getElementById('sessionId').value;
        if (sessionId) {
            fetch('/get-session-info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId: sessionId
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const currentSolution = data.current_solution || 1;
                    const totalSolutions = data.total_solutions || 1;
                    updateSolutionCounter(currentSolution, totalSolutions);
                }
            })
            .catch(error => {
                console.error('Error fetching session info:', error);
            });
        }
    } else if (stepId === 'step1') {
        // Hide solution counter when in Step 1
        const counterElement = document.getElementById('solutionCounter');
        if (counterElement) {
            counterElement.style.display = 'none';
        }
        
        // Reset page title
        const stepTitle = document.querySelector('.page-title');
        if (stepTitle) {
            stepTitle.textContent = 'Solution Overview Generator';
        }
    }
    
    // Update Feather icons if needed
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}

// Function to reset Step 2 forms for new solution
function resetStep2Forms() {
    console.log('Resetting Step 2 forms for new solution');
    
    // Clear image upload
    const solutionImage = document.getElementById('solutionImage');
    if (solutionImage) {
        solutionImage.value = '';
    }
    
    const imagePreview = document.getElementById('imagePreview');
    if (imagePreview) {
        imagePreview.src = '#';
        imagePreview.style.display = 'none';
    }
    
    const modalImagePreview = document.getElementById('modalImagePreview');
    if (modalImagePreview) {
        modalImagePreview.src = '#';
    }
    
    // Clear AI analysis
    const aiAnalysisInput = document.getElementById('aiAnalysis');
    if (aiAnalysisInput) {
        aiAnalysisInput.value = '';
    }
    
    const aiAnalysisText = document.getElementById('aiAnalysisText');
    if (aiAnalysisText) {
        aiAnalysisText.textContent = '';
    }
    
    const aiAnalysisContainer = document.getElementById('aiAnalysisContainer');
    if (aiAnalysisContainer) {
        aiAnalysisContainer.style.display = 'none';
    }
    
    // Clear solution explanation
    const solutionExplanation = document.getElementById('solutionExplanation');
    if (solutionExplanation) {
        solutionExplanation.value = '';
    }
    
    // Clear structured fields
    const structuredTitle = document.getElementById('structuredTitle');
    if (structuredTitle) {
        structuredTitle.value = '';
    }
    
    const structuredSteps = document.getElementById('structuredSteps');
    if (structuredSteps) {
        structuredSteps.value = '';
    }
    
    const structuredApproach = document.getElementById('structuredApproach');
    if (structuredApproach) {
        structuredApproach.value = '';
    }
    
    // Reset render boxes
    updateRenderBox('structuredTitle');
    updateRenderBox('structuredSteps');
    updateRenderBox('structuredApproach');
    
    const difficultySlider = document.getElementById('difficultySlider');
    const difficultyValue = document.getElementById('difficultyValue');
    if (difficultySlider && difficultyValue) {
        difficultySlider.value = 50;
        difficultyValue.textContent = '50';
        
        // Update custom slider appearance
        const difficultyFill = document.getElementById('difficultyFill');
        const difficultyRedOverlay = document.getElementById('difficultyRedOverlay');
        
        if (difficultyFill && difficultyRedOverlay) {
            difficultyFill.style.width = '50%';
            difficultyRedOverlay.style.width = '50%';
            
            // Calculate red opacity based on difficulty (0% = 0 opacity, 100% = 1 opacity)
            const redOpacity = 0.5;
            difficultyRedOverlay.style.opacity = redOpacity;
        }
    }
    
    // Reset layout selection to default (Layout 1)
    resetLayoutSelection();
    
    // Reset button states
    resetButtonStates();
    
    // Update View Image button state
    updateViewImageButtonState();
    
    // Reset file input appearance
    resetFileInputAppearance();
    
    console.log('Step 2 forms reset completed');
}

// Function to reset layout selection to default
function resetLayoutSelection() {
    const layoutButtons = document.querySelectorAll('.layout-btn');
    layoutButtons.forEach(btn => btn.classList.remove('selected'));
    
    // Set first layout as selected (default)
    if (layoutButtons.length > 0) {
        layoutButtons[0].classList.add('selected');
        console.log('Layout reset to default (Layout 1)');
    }
}

// Function to reset button states
function resetButtonStates() {
    const visionBtn = document.getElementById('visionBtn');
    if (visionBtn) {
        visionBtn.classList.add('disabled', 'icon-btn');
        visionBtn.classList.remove('btn-primary', 'image-uploaded');
    }
    
    const aiBtn = document.getElementById('aiBtn');
    if (aiBtn) {
        aiBtn.classList.add('disabled', 'icon-btn');
        aiBtn.classList.remove('btn-primary');
    }
    
    // Hide the re-analyze button
    const reanalyzeBtn = document.getElementById('reanalyzeBtn');
    if (reanalyzeBtn) {
        reanalyzeBtn.classList.add('d-none');
    }
    
    // Reset Per Node Stack button color
    const perNodeStackBtn = document.getElementById('perNodeStackBtn');
    if (perNodeStackBtn) {
        perNodeStackBtn.classList.remove('btn-success');
        perNodeStackBtn.classList.add('btn-light');
    }
    
    console.log('Button states reset');
}

// Function to update solution counter display
function updateSolutionCounter(current, total) {
    console.log(`Updating solution counter: ${current} of ${total}`);
    
    const counterElement = document.getElementById('solutionCounter');
    const currentNumberElement = document.getElementById('currentSolutionNumber');
    const totalSolutionsElement = document.getElementById('totalSolutions');
    
    if (counterElement && currentNumberElement && totalSolutionsElement) {
        // Update the counter values
        currentNumberElement.textContent = current;
        totalSolutionsElement.textContent = total;
        
        // Show the counter if we have more than one solution or if we're on solution 2+
        if (total > 1 || current > 1) {
            counterElement.style.display = 'block';
        } else {
            counterElement.style.display = 'none';
        }
    }
    
    // Update the page title to include solution number if we have multiple solutions
    const stepTitle = document.querySelector('.page-title');
    if (stepTitle) {
        if (total > 1 || current > 1) {
            stepTitle.textContent = `Solution Overview Generator - Solution ${current}`;
        } else {
            stepTitle.textContent = 'Solution Overview Generator';
        }
    }
}

// Global helper function to reset file input appearance
function resetFileInputAppearance() {
    const solutionImage = document.getElementById('solutionImage');
    if (solutionImage) {
        solutionImage.classList.remove('file-input-analyzing', 'file-input-analyzed', 'file-input-error');
        solutionImage.removeAttribute('data-status');
    }
}
