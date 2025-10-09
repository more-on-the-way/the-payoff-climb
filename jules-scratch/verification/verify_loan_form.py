from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        page.goto("http://localhost:3000")

        # Wait for the main container to be visible
        expect(page.locator(".max-w-4xl")).to_be_visible(timeout=30000)

        # Click 'Add Loan' button
        page.get_by_role("button", name="+ Add Loan").click()

        # There are two loans now. The new one is the second one.
        new_loan_form = page.locator(".bg-gray-50").nth(1)

        # Select Federal Loan for the new loan
        new_loan_form.get_by_role("button", name="Federal Loan").click()

        # Check if federal-specific fields are visible
        expect(new_loan_form.get_by_text("Is this loan currently in a grace period?")).to_be_visible()

        # Add another loan
        page.get_by_role("button", name="+ Add Loan").click()

        # The new loan is now the third one
        newest_loan_form = page.locator(".bg-gray-50").nth(2)

        # Select Private Loan
        newest_loan_form.get_by_role("button", name="Private Loan").click()

        # Check if private-specific fields are visible
        expect(newest_loan_form.get_by_placeholder("Lender Name")).to_be_visible()

        page.screenshot(path="jules-scratch/verification/verification.png")

        print("Verification script ran successfully and screenshot was taken.")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)