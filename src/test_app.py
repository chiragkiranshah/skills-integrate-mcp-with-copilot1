import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException
from fastapi.security import HTTPBasicCredentials

sys.path.insert(0, str(Path(__file__).parent))
import app


class TeacherAccessTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.credentials_file = Path(self.temp_dir.name) / "teachers.json"
        self.credentials_file.write_text(
            json.dumps({"coach": "test-password"}), encoding="utf-8"
        )
        self.credentials_path = patch.object(app, "teachers_file", self.credentials_file)
        self.credentials_path.start()
        self.original_participants = {
            name: details["participants"].copy()
            for name, details in app.activities.items()
        }

    def tearDown(self):
        for name, participants in self.original_participants.items():
            app.activities[name]["participants"] = participants
        self.credentials_path.stop()
        self.temp_dir.cleanup()

    def test_activity_list_remains_public(self):
        self.assertIn("Chess Club", app.get_activities())

    def test_anonymous_signup_and_unregister_are_rejected(self):
        participants = app.activities["Chess Club"]["participants"].copy()

        with self.assertRaises(HTTPException) as signup_error:
            app.signup_for_activity("Chess Club", "new@mergington.edu", None)
        with self.assertRaises(HTTPException) as unregister_error:
            app.unregister_from_activity("Chess Club", participants[0], None)

        self.assertEqual(signup_error.exception.status_code, 401)
        self.assertEqual(unregister_error.exception.status_code, 401)
        self.assertEqual(app.activities["Chess Club"]["participants"], participants)

    def test_teacher_can_sign_up_and_unregister_students(self):
        credentials = HTTPBasicCredentials(username="coach", password="test-password")

        result = app.signup_for_activity("Chess Club", "new@mergington.edu", credentials)
        self.assertIn("new@mergington.edu", app.activities["Chess Club"]["participants"])
        self.assertIn("Signed up", result["message"])

        result = app.unregister_from_activity("Chess Club", "new@mergington.edu", credentials)
        self.assertNotIn("new@mergington.edu", app.activities["Chess Club"]["participants"])
        self.assertIn("Unregistered", result["message"])

    def test_login_rejects_invalid_password(self):
        credentials = HTTPBasicCredentials(username="coach", password="wrong-password")

        with self.assertRaises(HTTPException) as error:
            app.login(credentials)

        self.assertEqual(error.exception.status_code, 401)


if __name__ == "__main__":
    unittest.main()