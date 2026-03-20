"""
GOLDEN HOUR — Test Suite
=========================
Unit tests for triage logic, BridgeController, and API endpoints.

Run: pytest tests/ -v
"""

import sys
import os
import json
import pytest

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from main import (
    bridge_classify,
    build_fallback_result,
    EmergencyInput,
    emergency_dispatch,
    mock_google_maps_geocode,
    mock_gcs_upload,
)


# ===================================================================
#  TEST 1: Cardiac Arrest → Severity RED
# ===================================================================
class TestCriticalTriageLogic:
    """Problem Statement Alignment: 'Cardiac Arrest' MUST map to Severity RED."""

    def test_cardiac_arrest_is_red(self):
        result = bridge_classify("Patient in cardiac arrest, not breathing")
        assert result["severity"] == "Red"
        assert result["action_code"] == "911_DISPATCH"

    def test_chest_pain_is_red(self):
        result = bridge_classify("45 year old male with severe chest pain")
        assert result["severity"] == "Red"
        assert "chest" in result["matched_keywords"] or "chest pain" in result["matched_keywords"]

    def test_not_breathing_is_red(self):
        result = bridge_classify("She's not breathing, please hurry!")
        assert result["severity"] == "Red"
        assert result["action_code"] == "911_DISPATCH"


# ===================================================================
#  TEST 2: Urgent conditions → Severity YELLOW
# ===================================================================
class TestUrgentTriageLogic:
    """Urgent but non-life-threatening cases must be Yellow."""

    def test_broken_bone_is_yellow(self):
        result = bridge_classify("I think I broke my leg falling off a ladder")
        assert result["severity"] == "Yellow"
        assert result["action_code"] == "EMS_PRIORITY2"

    def test_burn_is_yellow(self):
        result = bridge_classify("Minor burn on my hand from cooking")
        assert result["severity"] == "Yellow"


# ===================================================================
#  TEST 3: Non-urgent → Severity GREEN
# ===================================================================
class TestNonUrgentTriageLogic:
    def test_headache_is_green(self):
        result = bridge_classify("I have a mild headache")
        assert result["severity"] == "Green"
        assert result["action_code"] == "ROUTINE_CONSULT"

    def test_random_text_is_green(self):
        result = bridge_classify("The weather is nice today")
        assert result["severity"] == "Green"


# ===================================================================
#  TEST 4: Emotional Distress Bridge
# ===================================================================
class TestEmotionalDistressBridge:
    """BridgeController must detect emotional distress as critical."""

    def test_scared_not_moving(self):
        """'I'm scared he's not moving' → Should map to 911_DISPATCH."""
        result = bridge_classify("I'm scared, he's not moving, please help!")
        assert result["severity"] == "Red"
        assert result["action_code"] == "911_DISPATCH"


# ===================================================================
#  TEST 5: Dispatch Function
# ===================================================================
class TestDispatchFunction:
    """Agentic dispatch must return correct structure."""

    def test_critical_dispatch(self):
        action = emergency_dispatch(
            location="123 Main St",
            priority="CRITICAL",
            medical_summary="Cardiac arrest",
        )
        assert action.dispatched is True
        assert action.priority == "CRITICAL"
        assert len(action.units) == 3  # EMS-1, FIRE-2, MEDIC-1
        assert action.location.raw_text == "123 Main St"

    def test_standard_dispatch(self):
        action = emergency_dispatch(priority="STANDARD")
        assert action.dispatched is True
        assert len(action.units) == 1  # Only EMS-1


# ===================================================================
#  TEST 6: Input Validation
# ===================================================================
class TestInputValidation:
    def test_empty_text_rejected(self):
        with pytest.raises(Exception):
            EmergencyInput(text="   ")

    def test_valid_input_accepted(self):
        inp = EmergencyInput(text="Patient has chest pain")
        assert inp.text == "Patient has chest pain"


# ===================================================================
#  TEST 7: Mock Google Services
# ===================================================================
class TestMockGoogleServices:
    def test_geocode_returns_location(self):
        geo = mock_google_maps_geocode("near the big red park gate")
        assert geo.raw_text == "near the big red park gate"
        assert geo.latitude != 0.0

    def test_gcs_upload_returns_uri(self):
        uri = mock_gcs_upload("base64data", "photo.jpg")
        assert uri.startswith("gs://golden-hour-media/")


# ===================================================================
#  TEST 8: FHIR Code Mapping
# ===================================================================
class TestFHIRMapping:
    def test_cardiac_maps_to_fhir(self):
        result = bridge_classify("cardiac arrest")
        assert result["fhir_code"] == "I46.9"

    def test_fracture_maps_to_fhir(self):
        result = bridge_classify("broken arm")
        assert result["fhir_code"] == "S72.009A"


# ===================================================================
#  TEST 9: Fallback Result Structure
# ===================================================================
class TestFallbackResult:
    def test_fallback_returns_valid_triage(self):
        inp = EmergencyInput(text="Patient collapsed, not breathing")
        bridge = bridge_classify(inp.text)
        result = build_fallback_result(inp, bridge, ["text"])
        assert result.severity == "Red"
        assert len(result.recommended_actions) >= 3
        assert result.dispatch.dispatched is True
        assert result.fhir_condition_code != ""
        assert result.action_code == "911_DISPATCH"


# ===================================================================
#  ACCESSIBILITY TESTING INSTRUCTIONS
# ===================================================================
"""
A11y AUDIT INSTRUCTIONS:
========================
1. Run Lighthouse in Chrome DevTools:
   - Open Chrome → Navigate to the deployed URL
   - Press F12 → Go to "Lighthouse" tab
   - Select "Accessibility" category
   - Click "Analyze page load"

2. Run axe-core via CLI:
   npm install -g @axe-core/cli
   axe https://golden-hour-611115915544.us-central1.run.app/ --tags wcag2a,wcag2aa

3. Verify:
   - [ ] All interactive elements have aria-labels
   - [ ] Skip-to-content link present and functional
   - [ ] Focus indicators visible on Tab navigation
   - [ ] aria-live regions announce triage results
   - [ ] Colour contrast ratios meet WCAG AA (4.5:1)
   - [ ] Semantic HTML structure: <header>, <main>, <aside>, <section>
   - [ ] All form inputs have associated <label> elements
"""
