#!/usr/bin/env python3
"""
Test runner script for the Family Finance App.
"""
import subprocess
import sys
import os
import argparse

def run_command(command, description):
    """Run a command and handle errors."""
    print(f"\n{'='*60}")
    print(f"Running: {description}")
    print(f"Command: {command}")
    print(f"{'='*60}")
    
    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"❌ {description} FAILED")
        print(f"STDOUT: {result.stdout}")
        print(f"STDERR: {result.stderr}")
        return False
    else:
        print(f"✅ {description} PASSED")
        if result.stdout:
            print(f"Output: {result.stdout}")
        return True

def main():
    parser = argparse.ArgumentParser(description='Run Family Finance App tests')
    parser.add_argument('--type', choices=['all', 'unit', 'integration', 'api', 'frontend'], 
                       default='all', help='Type of tests to run')
    parser.add_argument('--coverage', action='store_true', help='Run with coverage report')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    parser.add_argument('--fast', action='store_true', help='Skip slow tests')
    
    args = parser.parse_args()
    
    # Change to project directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Build test command
    test_cmd = "python -m pytest"
    
    if args.verbose:
        test_cmd += " -v"
    
    if args.coverage:
        test_cmd += " --cov=app --cov-report=html --cov-report=term-missing"
    
    if args.fast:
        test_cmd += " -m 'not slow'"
    
    # Add test type filters
    if args.type == 'unit':
        test_cmd += " -m 'not integration'"
    elif args.type == 'integration':
        test_cmd += " -m 'integration'"
    elif args.type == 'api':
        test_cmd += " -m 'api'"
    elif args.type == 'frontend':
        test_cmd += " -m 'frontend'"
    
    # Run tests
    success = run_command(test_cmd, f"Running {args.type} tests")
    
    if success:
        print(f"\n🎉 All {args.type} tests passed!")
        if args.coverage:
            print("📊 Coverage report generated in htmlcov/index.html")
    else:
        print(f"\n❌ Some {args.type} tests failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
