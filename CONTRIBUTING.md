# Contributing to Job Application Assistant

Contributions are welcome! This project accepts contributions in the form of:

- Bug fixes
- New job board integrations  
- Documentation improvements
- Feature additions

## Development Setup

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Adding New Job Board Skills

To add a new job board scraper:

1. Create a new skill in `.agents/skills/<board-name>/`
2. Follow the existing skill structure (see `.agents/skills/hn-hiring-search/` for reference)
3. Add the skill to the job-scraper configuration
4. Test with the `/setup` command

## Code Style

- Follow existing code patterns
- Use descriptive variable and function names
- Add comments for complex logic
- Test your changes before submitting
